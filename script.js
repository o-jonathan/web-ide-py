document.documentElement.style.fontSize = localStorage.getItem("f-size") || "16px";
document.getElementById("f-size").value = localStorage.getItem("f-size") || "16px";

require.config({
    paths: {
        vs: "https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs"
    }
});

let editorReady = false;

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
            },
            insertSpaces: true,
            tabSize: 4
        }
    );

    editorReady = true;
    editor.onDidFocusEditorText(updateHotbar);
    editor.onDidBlurEditorText(updateHotbar);
    pgLoad();
});



let pyodide;
let pythonReady = false;
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

    pythonReady = true;
    pgLoad()
}

async function runCode() {
    output.textContent = "";

    try {
        const code = editor.getValue().replace(/\t/g, "    ");

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

async function pgLoad() {
    const loadscreen = document.getElementById("loading")
    if (!loadscreen)
        return

    if (!window.editor || !pythonReady)
        return

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
    closeMenu();
}

function moveCursor(direction, ev) {
    ev.preventDefault();
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

function moveSel(direction, ev) {
    ev.preventDefault();
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
let moveTimeout;

function startMove(sel, dir) {
    const ev = this.event;
    sel ? moveSel(dir, ev) : moveCursor(dir, ev);

    moveTimeout = setTimeout(() => {
        moveInterval = setInterval(() => {
            sel ? moveSel(dir, ev) : moveCursor(dir, ev);
        }, 40);
    }, 300);
}

function stopMove() {
    clearTimeout(moveTimeout);
    clearInterval(moveInterval);
}

function selAll() {
    editor.trigger("", "editor.action.selectAll", {});
}

function clearEditor() {
    editor.setValue("");
    closeMenu();
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

    let editorFocused = false;

    if (editorReady)
        editorFocused = editor.hasTextFocus();

    hotbar.style.display = keyboardHeight > 0 ? "flex" : "none";
}

window.visualViewport?.addEventListener("resize", updateHotbar);
window.visualViewport?.addEventListener("scroll", updateHotbar);

updateHotbar();

function validateFile(input) {
    const file = input.files[0];

    if (!file)
        return

    if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.py')) {
        loadFile(file);
    } else {
        alert('Please select a .txt or a .py file.');
        input.value = '';
    }
}

async function loadFile(file) {
    const content = await file.text();
    editor.setValue(content);
    closeMenu();
}

const menu = document.getElementById('menu')

function openMenu() {
    menu.style.display = 'flex';
}

function closeMenu() {
    menu.style.display = 'none';
}

function expandOutput() {
    const bg = document.createElement("div");
    const panel = document.createElement("div");
    const topbar = document.createElement("div");
    const title = document.createElement("span");
    const container = document.createElement("div");
    const close = document.createElement("button");
    const copy = document.createElement("button");
    const exOutput = document.createElement("pre");

    bg.className = "exOutput-bg";
    panel.className = "exOutput-panel";
    topbar.className = "exOutput-topbar";
    container.className = "exOutput-container";
    close.classList.add("btn-err");
    close.classList.add("btn");
    copy.classList.add("secondary");
    copy.classList.add("btn");
    exOutput.classList = "output";

    title.textContent = "OUTPUT";
    close.innerHTML = `<i class="bi bi-x-lg"></i>`;
    copy.innerHTML = `<i class="bi bi-clipboard-fill"></i>`;
    exOutput.textContent = output.textContent;

    close.onclick = () => {
        bg.remove();
    }

    copy.onclick = copyOutput();

    bg.appendChild(panel);
    panel.appendChild(topbar);
    topbar.appendChild(title);
    topbar.appendChild(container);
    container.appendChild(copy);
    container.appendChild(close);
    panel.appendChild(exOutput);
    document.body.appendChild(bg);
}