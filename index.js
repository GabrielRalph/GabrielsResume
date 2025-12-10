import data from './data.js';
import "./template.js";


const queryParams = new URLSearchParams(window.location.search);
let query = {
    type: queryParams.get('type') || 'engineering'
};

data.query = query;


const root = document.getElementById('root');
root.value = data;


window.onkeydown = (e) => {
    if (e.key === "g") {
        root.toggleAttribute("guides")
    }
}

async function testFontSize(fs) {
    document.body.style.setProperty('--font-size-mm', fs);
    await new Promise(resolve => requestAnimationFrame(resolve));
    let size = root.getBoundingClientRect();
    let scaleX = size.width / 210;
    let actualHeight = size.height / scaleX;
    return actualHeight;
}

const TestSizeStart = 2;
const TestSizeEnd = 7;
const Resolution = 10;
const Depth = 3;
const DesiredHeightMM = 290;
async function fitToA4() {
    let start = TestSizeStart;
    let end = TestSizeEnd;
    root.toggleAttribute("resizing", true);

    for (let d = 0; d < Depth; d++) {
        let lastSize = null;
        let lastFs = null;
        for (let i = 0; i < Resolution; i++) {
            let fs = start + (end - start) * i / Resolution;
            let size = await testFontSize(fs);
            if (lastSize != null && size > DesiredHeightMM && lastSize < DesiredHeightMM) {
                end = fs;
                start = lastFs;
                break;
            } else if (i == Resolution - 1) {
                start = fs;
                end = end;
                break;
            }
            lastSize = size;
            lastFs = fs;
        }
    }

    let height = await testFontSize(start);
    console.log(`Final size: ${height}mm at font size: ${start}mm`);


    root.toggleAttribute("resizing", false);
    window.print();
}
window.fitToA4 = fitToA4;