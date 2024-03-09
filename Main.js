
function Call(name, args){
    return new CallSyntax(name, args.map(a=>Parse(Tokenizer(a))));
}

function Assign(name, expression){
    return new AssignSyntax(name, Parse(Tokenizer(expression)));
}

function BrIf(label, condition){
    return new BrIfSyntax(label, Parse(Tokenizer(condition)));
}

function Loop(label){
    return new LoopSyntax(label);
}

function End(){
    return new EndSyntax();
}

function RunWasm(program){
    var importFunctions = program.filter(p=>p.constructor.name == 'ImportFunctionSyntax');
    var functions = program.filter(p=>p.constructor.name == 'FunctionSyntax');
    var id = 0;
    for(var f of importFunctions){
        f.id = id;
        id++;
    }
    for(var f of functions){
        f.id = id;
        id++;
    }
    var wasmBytes = Wasm(importFunctions.map(f=>f.ToWasm()), functions.map(f=>f.ToWasm(program)));
    
    var importObject = {env:{}};
    importObject.env.memory = new WebAssembly.Memory({ initial: 10, maximum: 10 });
    for(var f of importFunctions){
        importObject.env[f.name] = new Function(...f.parameters.map(p=>p.name), f.code);
    }
    WebAssembly.instantiate(wasmBytes, importObject).then(
        (obj) => {
            obj.instance.exports.Main();
        }
    );
}

var program = [
    new ImportFunctionSyntax('void', 'Print', [new ParameterSyntax('i32', 'i')], 'console.log(i);'),
    new FunctionSyntax(true, 'void', 'Main', [], [
        Assign('i', '6'),
        Loop('loop1'),
        Loop('loop2'),
        Assign('i', 'i + 1'),
        Call('Print', ['i']),
        BrIf('loop2', 'i < 10'),
        Call('Print', ['i * 2']),
        BrIf('loop1', 'i < 15'),
        End(),
        End(),
    ])
];

RunWasm(program);