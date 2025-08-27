function enviarCorreoOutlook(destinatario, asunto, cuerpo){
  const outlookUrl = `https://outlook.office365.com/mail/deeplink/compose?to=${encodeURIComponent(destinatario)}&subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  window.open(outlookUrl, '_blank');
}
function emailPath(correo){
  return (correo||'').toLowerCase().replace(/\./g, ',');
}
