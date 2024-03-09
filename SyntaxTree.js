
class IdentifierSyntax{
    constructor(value){
        this.value = value;
    }
}

class BinaryOpSyntax{
    constructor(left, right, op){
        this.left = left;
        this.right = right;
        this.op = op;
    }
}

class IntConstSyntax{
    constructor(value){
        this.value = value;
    }
}

class FloatConstSyntax{
    constructor(value){
        this.value = value;
    }
}

class CallSyntax{
    constructor(name, args){
        this.name = name;
        this.args = args;
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
}