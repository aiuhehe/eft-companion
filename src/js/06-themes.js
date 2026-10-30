// ================== THEMES ==================
const THEMES = [
  { id:'tarkov',       name:'タルコフ',          swatch:'#f6c90e',
    vars:{'--bg-primary':'#0f1117','--bg-secondary':'#1a1f2e','--bg-tertiary':'#0a0d14','--border':'#2d3748','--border-light':'#1e2536','--text-primary':'#e2e8f0','--text-secondary':'#94a3b8','--text-dim':'#64748b','--accent':'#f6c90e','--accent-on':'#0f1117','--accent-muted':'#854d0e'}},
  { id:'dark-orange',  name:'ダーク×オレンジ',   swatch:'#ff8906',
    vars:{'--bg-primary':'#0f0e17','--bg-secondary':'#1c1b2e','--bg-tertiary':'#090813','--border':'#2d2b3e','--border-light':'#1e1c30','--text-primary':'#fffffe','--text-secondary':'#a7a9be','--text-dim':'#6a6c82','--accent':'#ff8906','--accent-on':'#0f0e17','--accent-muted':'#8a4800'}},
  { id:'warm-brown',   name:'ウォーム×ピンク',   swatch:'#e78fb3',
    vars:{'--bg-primary':'#55423d','--bg-secondary':'#6b5550','--bg-tertiary':'#3d2e2a','--border':'#7a6560','--border-light':'#664f4a','--text-primary':'#fffffe','--text-secondary':'#fff3ec','--text-dim':'#c4a49a','--accent':'#e78fb3','--accent-on':'#271c19','--accent-muted':'#7a3a5a'}},
  { id:'light-teal',   name:'ライト×ティール',   swatch:'#078080',
    vars:{'--bg-primary':'#f8f5f2','--bg-secondary':'#ede8e3','--bg-tertiary':'#e4ddd6','--border':'#c8c0b8','--border-light':'#ddd8d2','--text-primary':'#232323','--text-secondary':'#555858','--text-dim':'#909090','--accent':'#078080','--accent-on':'#fffffe','--accent-muted':'#045050'}},
];
function applyTheme(themeId) {
  const t = THEMES.find(x => x.id === themeId) || THEMES[0];
  Object.entries(t.vars).forEach(([k,v]) => document.documentElement.style.setProperty(k,v));
}

