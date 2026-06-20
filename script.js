document.documentElement.style.fontSize = localStorage.getItem("f-size") || "16px";
document.getElementById("f-size").value = localStorage.getItem("f-size") || "16px";

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
            fontSize: localStorage.getItem("f-size") || "16px",
            automaticLayout: true,
            minimap: {
                enabled: false
            }
        }
    );

    editor.onDidFocusEditorText(updateHotbar);
    editor.onDidBlurEditorText(updateHotbar);
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
            output.className = 'success';
        }
    });

    pyodide.setStderr({
        batched: (text) => {
            output.textContent += text + "\n";
        }
    });

    pyodide.globals.set("js_input", (promptText = "") => {
        return window.prompt(promptText) ?? "";
    });

    await pyodide.runPythonAsync(`
import builtins

def browser_input(prompt=""):
    return js_input(prompt)

builtins.input = browser_input
`);
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
        output.className = 'error';
    }

    output.scrollTop = output.scrollHeight;
}

async function copyOutput() {
    try {
        navigator.clipboard.writeText(output.textContent)
    } catch (err) {
        console.error(err)
    }
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

document.getElementById("f-size").addEventListener("change", (event) => {
    document.documentElement.style.fontSize = event.target.value;
    editor.updateOptions({ fontSize: event.target.value });
    localStorage.setItem("f-size", event.target.value);
})

function download() {
    const filename = document.getElementById('name').value || "main.py"
    const text = editor.getValue()

    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    if (confirm(`You are about to download ${filename} to your device.\nProceed?`)) {
        element.click();
    }

    document.body.removeChild(element);
}

function moveCursor(direction) {
    switch (direction) {
        case "u":
            editor.trigger("", "cursorUp", {});
            break;
        case "l":
            editor.trigger("", "cursorLeft", {});
            break;
        case "r":
            editor.trigger("", "cursorRight", {});
            break;
        case "d":
            editor.trigger("", "cursorDown", {});
            break;
    }
    editor.focus();
}

function moveSel(direction) {
    switch (direction) {
        case "l":
            editor.trigger("", "cursorLeftSelect", {});
            break;
        case "r":
            editor.trigger("", "cursorRightSelect", {});
            break;
    }
    editor.focus();
}

let moveInterval;

function startMove(dir) {
    moveSel(dir);

    moveInterval = setInterval(() => {
        moveSel(dir);
    }, 50);
}

function stopMove() {
    clearInterval(moveInterval);
}

function selAll() {
    editor.trigger("", "editor.action.selectAll", {});
}

function clearEditor() {
    editor.setValue("");
}

initPython();



function updateHotbar() {
    const hotbar = document.querySelector(".hotbar");

    if (!window.visualViewport || !window.editor) return;

    const keyboardHeight =
        window.innerHeight -
        window.visualViewport.height -
        window.visualViewport.offsetTop;

    hotbar.style.bottom = `calc(${Math.max(0, keyboardHeight)}px + 0.125rem)`;

    const editorFocused = editor.hasTextFocus();

    hotbar.style.display = keyboardHeight > 0 || editorFocused ? "flex" : "none";
}

window.visualViewport?.addEventListener("resize", updateHotbar);
window.visualViewport?.addEventListener("scroll", updateHotbar);

updateHotbar();