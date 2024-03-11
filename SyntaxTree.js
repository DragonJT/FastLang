
function GetValtype(type){
    if(type == 'i32'){ return Valtype.i32; }
    if(type == 'f32'){ return Valtype.f32; }
    throw 'Unexpected type:'+type;
}

function GetReturnValtype(type){
    if(type == 'void'){ return []; }
    return [GetValtype(type)];
}

class ParameterSyntax{
    constructor(type, name){
        this.type = type;
        this.name = name;
    }
}

class LocalSyntax{
    constructor(type, name){
        this.type = type;
        this.name = name;
    }
}

class CastSyntax{
    constructor(type, expression){
        this.type = type;
        this.expression = expression;
    }

    CalcType(program, variables){
        this.fromType = this.expression.CalcType(program, variables);
        return this.type;
    }

    ToWasm(){
        if(this.type == 'i32' && this.fromType == 'f32'){
            return [...this.expression.ToWasm(), Opcode.i32_trunc_f32_s];
        }
        else if(this.type == 'f32' && this.fromType == 'i32'){
            return [...this.expression.ToWasm(), Opcode.f32_convert_i32_s];
        }
        throw 'Cant cast from '+this.fromType+' to '+this.type;
    }
}

class LoopSyntax{
    constructor(label){
        this.label = label;
    }

    CalcType(){
        return 'void';
    }

    FindJumpTos(blockStack){
        blockStack.push(this.label);
    }

    ToWasm(){
        return [Opcode.loop, Blocktype.void];
    }
}

class VarSyntax{
    constructor(name, expression){
        this.name = name;
        this.expression = expression;
    }

    CalcType(program, variables){
        var type = this.expression.CalcType(program, variables);
        if(type == 'void'){
            throw 'Local shouldnt have void type';
        }
        this.local = new LocalSyntax(type, this.name);
        variables.push(this.local);
        return 'void';
    }

    ToWasm(){
        return [...this.expression.ToWasm(), Opcode.set_local, ...unsignedLEB128(this.local.id)];
    }
}

class BrIfSyntax{
    constructor(label, condition){
        this.label = label;
        this.condition = condition;
    }

    CalcType(program, variables){
        var type = this.condition.CalcType(program, variables);
        if(type != 'bool'){
            throw 'Expecting bool for br_if statement: '+type; 
        }
        return 'void';
    }

    FindJumpTos(blockStack){
        var i = blockStack.length-1;
        while(true){
            if(i<0){
                throw 'Block not found with label: '+this.label;
            }
            if(blockStack[i] == this.label){
                this.jumpTo = blockStack.length - 1 - i;
                break;
            }
            i--;
        }
    }

    ToWasm(program, variables){
        return [...this.condition.ToWasm(program, variables), Opcode.br_if, ...unsignedLEB128(this.jumpTo)];
    }
}

class EndSyntax{
    CalcType(){
        return 'void';
    }

    FindJumpTos(blockStack){
        if(blockStack.length == 0){
            throw 'blockstack empty... too many ends';
        }
        blockStack.pop();
    }

    ToWasm(){
        return [Opcode.end];
    }
}

class IdentifierSyntax{
    constructor(name){
        this.name = name;
    }

    CalcType(_program, variables){
        this.variable = variables.find(v=>v.name == this.name);
        if(!this.variable){
            throw 'Identifier: Cant find variable with name: '+this.name;
        }
        return this.variable.type;
    }

    ToWasm(){
        return [Opcode.get_local, ...unsignedLEB128(this.variable.id)];
    }
}

class BinaryOpSyntax{
    constructor(left, right, op){
        this.left = left;
        this.right = right;
        this.op = op;
    }

    CalcType(program, variables){
        var left = this.left.CalcType(program, variables);
        var right = this.right.CalcType(program, variables);
        if(left == right){
            this.type = left;
            if(this.op == '<' || this.op == '>'){
                return 'bool';
            }
            return this.type;
        }
        else{
            throw 'Types dont match: '+left+' '+this.op+' '+right;
        }
    }

    ToWasm(){
        function OpToWasm(op, type){
            if(type == 'i32'){
                if(op=='+'){ return Opcode.i32_add; }
                if(op=='-'){ return Opcode.i32_sub; }
                if(op=='*'){ return Opcode.i32_mul; }
                if(op=='/'){ return Opcode.i32_div_s; }
                if(op=='<'){ return Opcode.i32_lt; }
                if(op=='>'){ return Opcode.i32_gt; }
                throw 'op not found: '+op;
            }
            else if(type == 'f32'){
                if(op=='+'){ return Opcode.f32_add; }
                if(op=='-'){ return Opcode.f32_sub; }
                if(op=='*'){ return Opcode.f32_mul; }
                if(op=='/'){ return Opcode.f32_div; }
                if(op=='<'){ return Opcode.f32_lt; }
                if(op=='>'){ return Opcode.f32_gt; }
                throw 'op not found: '+op;
            }
            else{
                throw 'Cant operate on type: '+this.type;
            }
        }
        return [...this.left.ToWasm(), ...this.right.ToWasm(), OpToWasm(this.op, this.type)];
    }
}

class IntConstSyntax{
    constructor(value){
        this.value = value;
    }

    CalcType(){
        return 'i32';
    }

    ToWasm(){
        return [Opcode.i32_const, ...signedLEB128(parseFloat(this.value))];
    }
}

class FloatConstSyntax{
    constructor(value){
        this.value = value;
    }

    CalcType(){
        return 'f32';
    }

    ToWasm(){
        return [Opcode.f32_const, ...ieee754(parseFloat(this.value))];
    }
}

class CallSyntax{
    constructor(name, args){
        this.name = name;
        this.args = args;
    }

    CalcType(program, variables){
        function CompareArgsAndParameters(args, parameters){
            if(args.length != parameters.length){
                return false;
            }
            for(var i=0;i<args.length;i++){
                if(args[i] != parameters[i].type){
                    return false;
                }
            }
            return true;
        }
        var argTypes = this.args.map(a=>a.CalcType(program, variables));
        var funcs = program.filter(f=>f.name == this.name);
        if(funcs.length == 0){
            throw 'Cant find function with name: '+this.name;
        }
        this.func = funcs.find(f=>CompareArgsAndParameters(argTypes, f.parameters));
        if(this.func){
            return this.func.returnType;
        }
        throw 'Cant find function with matching arg types'+JSON.stringify(argTypes);
    }

    ToWasm(){
        var args = this.args.map(a=>a.ToWasm()).flat();
        return [...args, Opcode.call, ...unsignedLEB128(this.func.id)];
    }
}

class AssignSyntax{
    constructor(name, expression){
        this.name = name;
        this.expression = expression;
    }

    CalcType(program, variables){
        this.variable = variables.find(v=>v.name == this.name);
        if(!this.variable){
            throw 'Assign: Cant find variable with name: '+this.name;
        }
        this.expression.CalcType(program, variables);
        return 'void';
    }

    ToWasm(){
        return [...this.expression.ToWasm(), Opcode.set_local, ...unsignedLEB128(this.variable.id)];
    }
}

class FunctionSyntax{
    constructor(_export, returnType, name, parameters, body){
        this.export = _export;
        this.returnType = returnType;
        this.name = name;
        this.parameters = parameters;
        this.body = body;
    }

    ToWasm(program){
        var variables = [...this.parameters];
        for(var s of this.body){
            s.CalcType(program, variables)
        }

        var i32s = variables.filter(v=>v.constructor.name == 'LocalSyntax' && (v.type == 'i32' || v.type == 'bool'));
        var f32s = variables.filter(v=>v.constructor.name == 'LocalSyntax' && v.type == 'f32s');
        var id = 0;
        for(var p of this.parameters){
            p.id = id;
            id++;
        }
        for(var v of i32s){
            v.id = id;
            id++;
        }
        for(var v of f32s){
            v.id = id;
            id++;
        }
        var wasmLocals = [];
        if(i32s.length > 0){
            wasmLocals.push(new WasmLocals(i32s.length, Valtype.i32));
        }
        if(f32s.length > 0){
            wasmLocals.push(new WasmLocals(f32s.length, Valtype.f32));
        }

        var blockStack = [];
        for(var s of this.body){
            if(s.FindJumpTos){
                s.FindJumpTos(blockStack);
            }
        }
        if(blockStack.length>0){
            throw 'Not enough block ends... '+JSON.stringify(blockStack);
        }

        var codeBytes = [...this.body.map(s=>s.ToWasm()).flat(), Opcode.end];
        return WasmFunc(this.export, 
            GetReturnValtype(this.returnType), 
            this.name, 
            this.parameters.map(p=>GetValtype(p.type)), 
            wasmLocals, 
            codeBytes);
    }
}

class ImportFunctionSyntax{
    constructor(returnType, name, parameters, code){
        this.returnType = returnType;
        this.name = name;
        this.parameters = parameters;
        this.code = code;
    }

    ToWasm(){
        return WasmImportFunc(GetReturnValtype(this.returnType), 'f'+this.id+'_'+this.name, this.parameters.map(p=>GetValtype(p.type)));
    }
}