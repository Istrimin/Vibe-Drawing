const fs = require('fs');
const code = fs.readFileSync('js/main.js', 'utf8');
const lines = code.split('\n');

let depth = 0;
const stack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    // Skip strings and comments
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      j++;
      while (j < line.length) {
        if (line[j] === '\\' ) { j++; j++; continue; }
        if (line[j] === quote) break;
        j++;
      }
      continue;
    }
    if (ch === '/' && line[j+1] === '/') break;
    
    if (ch === '{') {
      depth++;
      stack.push({ line: i+1, depth });
    }
    if (ch === '}') {
      depth--;
      if (depth < 0) {
        console.log(`EXTRA } at line ${i+1}`);
        process.exit(1);
      }
      stack.pop();
    }
  }
}

if (depth > 0) {
  console.log(`MISSING ${depth} closing }`);
  const last = stack[stack.length - 1];
  console.log(`Last open at line ${last.line}, depth ${last.depth}`);
  console.log('Context:', lines[last.line - 1].trim().substring(0, 80));
  process.exit(1);
} else {
  console.log('✓ Brackets balanced');
}
