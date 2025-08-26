function enviarCorreoOutlook(destinatario, asunto, cuerpo){
  // const mailto = `mailto:${destinatario}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  // window.open(mailto, '_blank');
  // mailto deshabilitado; envío manejado vía Apps Script
}
function emailPath(correo){
  return (correo||'').toLowerCase().replace(/\./g, ',');
}
