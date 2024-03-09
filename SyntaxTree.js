
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

class IdentifierSyntax{
    constructor(name){
        this.name = name;
    }

    ToWasm(_, variables){
        var id = variables.findIndex(v=>v.name == this.name);
        if(id<0){
            throw 'Cant find variable with name: '+this.name;
        }
        return [Opcode.get_local, ...unsignedLEB128(id)];
    }
}

class BinaryOpSyntax{
    constructor(left, right, op){
        this.left = left;
        this.right = right;
        this.op = op;
    }

    ToWasm(program, variables){
        function OpToWasm(op){
            if(op=='+'){ return Opcode.i32_add; }
            if(op=='-'){ return Opcode.i32_sub; }
            if(op=='*'){ return Opcode.i32_mul; }
            if(op=='/'){ return Opcode.i32_div_s; }
            throw 'op not found: '+op;
        }
        return [...this.left.ToWasm(program, variables), ...this.right.ToWasm(program, variables), OpToWasm(this.op)];
    }
}

class IntConstSyntax{
    constructor(value){
        this.value = value;
    }

    ToWasm(){
        return [Opcode.i32_const, ...signedLEB128(parseFloat(this.value))];
    }
}

class FloatConstSyntax{
    constructor(value){
        this.value = value;
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

    ToWasm(program, variables){
        var args = this.args.map(a=>a.ToWasm(program, variables)).flat();
        var func = program.find(f=>f.name == this.name);
        if(func){
            return [...args, Opcode.call, ...unsignedLEB128(func.id)];
        }
        else{
            throw 'Cant find function with name: '+this.name;
        }
    }
}

class AssignSyntax{
    constructor(name, expression){
        this.name = name;
        this.expression = expression;
    }

    ToWasm(program, variables){
        var id = variables.findIndex(v=>v.name == this.name);
        if(id<0){
            throw 'Cant find variable with name: '+this.name;
        }
        return [...this.expression.ToWasm(program, variables), Opcode.set_local, ...unsignedLEB128(id)];
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
            if(s.constructor.name == 'AssignSyntax'){
                if(!variables.includes(v=>v.name==s.name)){
                    variables.push(new LocalSyntax('i32', s.name));
                }
            }
        }
        var codeBytes = [...this.body.map(s=>s.ToWasm(program, variables)).flat(), Opcode.end];
        return WasmFunc(this.export, 
            GetReturnValtype(this.returnType), 
            this.name, 
            this.parameters.map(p=>GetValtype(p.type)), 
            [new WasmLocals(variables.length - this.parameters.length, Valtype.i32)], 
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
        return WasmImportFunc(GetReturnValtype(this.returnType), this.name, this.parameters.map(p=>GetValtype(p.type)));
    }
}