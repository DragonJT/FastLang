
function Call(name, args){
    return new CallSyntax(name, args.map(a=>Parse(Tokenizer(a))));
}

function Assign(name, expression){
    return new AssignSyntax(name, Parse(Tokenizer(expression)));
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
        Assign('x', '5 - 2'),
        Call('Print', ['45 - 10 * x']),
    ])
];

RunWasm(program);