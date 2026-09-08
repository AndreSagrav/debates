const fs = require('fs');

['public-view.html', 'index.html', 'Estable/public-view.html', 'Estable/Index.html'].forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const scripts = content.match(/<script[\s\S]*?<\/script>/gi) || [];
  console.log('Checking ' + file + ': ' + scripts.length + ' scripts');
  scripts.forEach((s, idx) => {
    const srcMatch = s.match(/src=["']([^"']+)["']/i);
    if(srcMatch) {
      console.log('  Script ' + idx + ' (external): ' + srcMatch[1]);
    } else {
      const code = s.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      try {
        new Function(code);
        console.log('  Script ' + idx + ' (inline): OK syntax');
      } catch(e) {
        console.error('  Script ' + idx + ' (inline) SYNTAX ERROR in ' + file + ':', e.message);
      }
    }
  });
});
