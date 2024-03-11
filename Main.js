
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
    _Function(true, 'void', 'Main', [], `
        var i = 6
        var x = 10
        loop loop1
            loop loop2
                i = i + 1
                Print(i)
                br_if loop2 (i < x)
                Print(i * 2)
                br_if loop1 (i < 12)
            end
        end
        Print(x)
    `),
];

RunWasm(program);