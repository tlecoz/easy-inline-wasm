const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const wabtInit = require('wabt');
const tmp = require('tmp');

const app = express();
app.use(cors({
    exposedHeaders: ['X-WASM-Memory-Pages']
}));
const upload = multer();

app.use(express.json());

app.post('/compile', upload.none(), async (req, res) => {
  // 1. Récupère le code Rust envoyé
  const rustSource = req.body.rust;
  if (!rustSource) {
    return res.status(400).json({ error: 'Missing Rust source code.' });
  }

  // 2. Crée un fichier temporaire pour le code Rust
  const rustFile = tmp.tmpNameSync({ postfix: '.rs' });
  const wasmFile = tmp.tmpNameSync({ postfix: '.wasm' });
  fs.writeFileSync(rustFile, rustSource, 'utf8');

  try {
    // 3. Compile le Rust en WASM
    execSync(`rustc --target wasm32-unknown-unknown -O --crate-type=cdylib "${rustFile}" -o "${wasmFile}"`, { stdio: 'inherit' });

    // 4. (Optionnel) Patch la mémoire si besoin (exemple avec wabt)
     const wabt = await wabtInit();
     const wasmBuffer = fs.readFileSync(wasmFile);
     const module = wabt.readWasm(wasmBuffer, { readDebugNames: true });
     let wat = module.toText({ foldExprs: false, inlineExport: false });


    const memoryMatch = wat.match(/\(memory\s*\(\;\d+\;\)\s*(\d+)\)/);
   
    let size = memoryMatch[1];
    if (memoryMatch) {
        wat = wat.replace(/\(memory\s*\(\;\d+\;\)\s*(\d+)\)/, '');
        wat = wat.replace(/(\(module[^\n]*\n)/, `$1(import "env" "memory" (memory ${size}))\n`);
    }


     const newModule = wabt.parseWat('patched.wat', wat);
     const { buffer } = newModule.toBinary({});
     fs.writeFileSync(wasmFile, Buffer.from(buffer));

     
    // 5. Renvoie le binaire wasm au client
    console.log("size = ",size)
    res.setHeader('Content-Type', 'application/wasm');
    res.setHeader('X-WASM-Memory-Pages', size);
    res.send(fs.readFileSync(wasmFile));

  } catch (err) {
    res.status(500).json({ error: 'Compilation failed.', details: err.message });
  } finally {
    // 6. Nettoie les fichiers temporaires
    fs.unlinkSync(rustFile);
    fs.unlinkSync(wasmFile);
  }
});

app.listen(3000, () => {
  console.log('Rust → WASM server running on http://localhost:3000');
});
