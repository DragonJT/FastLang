
function _Function(_export, returnType, name, parameters, code){
    return new FunctionSyntax(_export, returnType, name, parameters, ParseFunctionBody(code));
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
    var wasmImportFunctions = importFunctions.map(f=>f.ToWasm());
    var wasmBytes = Wasm(wasmImportFunctions, functions.map(f=>f.ToWasm(program)));
    
    var importObject = {env:{}};
    importObject.env.memory = new WebAssembly.Memory({ initial: 10, maximum: 10 });
    for(var i=0;i<importFunctions.length;i++){
        var f = importFunctions[i];
        importObject.env[wasmImportFunctions[i].name] = new Function(...f.parameters.map(p=>p.name), f.code);
    }
    WebAssembly.instantiate(wasmBytes, importObject).then(
        (obj) => {
            obj.instance.exports.Main();
        }
    );
}

var program = [
    new ImportFunctionSyntax('void', 'Print', [new ParameterSyntax('i32', 'i')], 'console.log("Int:"+i);'),
    new ImportFunctionSyntax('void', 'Print', [new ParameterSyntax('f32', 'i')], 'console.log("Float:"+i);'),
    _Function(true, 'void', 'Main', [], `
        Print(4.5)
        Print(2)
    `),
];

RunWasm(program);