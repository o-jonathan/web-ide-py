require.config({
    paths: {
        vs: "https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs"
    }
});

require(["vs/editor/editor.main"], function () {
    window.editor = monaco.editor.create(
        document.getElementById("editor"),
        {
            value: ``,
            language: "python",
            theme: "vs-dark",
            automaticLayout: true,
            minimap: {
                enabled: false
            }
        }
    );
    pgLoad()
});



let pyodide;
const output = document.getElementById("output");

async function initPython() {
    pyodide = await loadPyodide();
    await pyodide.loadPackage("numpy");

    pyodide.setStdout({
        batched: (text) => {
            output.textContent += text + "\n";
        }
    });

    pyodide.setStderr({
        batched: (text) => {
            output.textContent += text + "\n";
        }
    });
}

async function runCode() {
    output.textContent = "";

    try {
        const code = editor.getValue();

        const result = await pyodide.runPythonAsync(code);

        if (result !== undefined) {
            output.textContent += result;
        }
    } catch (err) {
        output.textContent += err;
    }
}

async function copyCode() {
    navigator.clipboard.writeText(output.textContent)
}

function addText(text) {
    const position = editor.getPosition();

    editor.executeEdits("", [{
        range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
        ),
        text: text
    }]);

    editor.focus();
}

function pgLoad() {
    const loadscreen = document.getElementById("loading")

    loadscreen.addEventListener('animationend', () => {
        loadscreen.remove()
    })

    loadscreen.classList.add('fade')
}

initPython();