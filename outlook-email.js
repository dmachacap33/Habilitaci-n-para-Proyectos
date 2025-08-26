// URL del flujo de Power Automate que enviará el correo. Debe configurarse
// externamente en la variable global `POWER_AUTOMATE_URL`.
const POWER_AUTOMATE_URL = window.POWER_AUTOMATE_URL || '';

/**
 * Envía un correo utilizando un flujo de Power Automate.
 * @param {string} destinatario  Correo o lista separada por comas.
 * @param {string} asunto        Asunto del mensaje.
 * @param {string} cuerpo        Cuerpo del mensaje en texto plano.
 * @param {string} [html]        Contenido HTML para generar el PDF adjunto.
 */
async function enviarCorreoOutlook(destinatario, asunto, cuerpo, html){
  if(!POWER_AUTOMATE_URL){
    console.error('POWER_AUTOMATE_URL no configurada');
    return;
  }
  const payload = { to: destinatario, subject: asunto, body: cuerpo };
  if(html) payload.html = html;
  try{
    const res = await fetch(POWER_AUTOMATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error(`Estado ${res.status}`);
  }catch(err){
    console.error('Error enviando correo:', err);
  }
}
function emailPath(correo){
  return (correo||'').toLowerCase().replace(/\./g, ',');
}
