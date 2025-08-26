/**
 * Google Apps Script Web App backend with additional email fields.
 */

function doPost(e) {
  try {
    if (!e || !e.parameter || !e.parameter.jsonData) {
      throw new Error('No se recibieron datos en el parámetro "jsonData".');
    }

    const params = JSON.parse(e.parameter.jsonData);
    const action = params.action;
    const rid = (e.parameter && e.parameter.rid) || "";

    let result;
    if (action === 'askAI') {
      result = askAIProxy(params.conversation, params.systemInstruction);
    } else if (action === 'saveToSheet') {
      result = saveToSheetAndNotify(params.data);
    } else {
      result = saveToSheetAndNotify(params);
    }

    if (e.parameter && e.parameter.transport === 'iframe') {
      return wrapAsPostMessage_(result, rid);
    }
    return corsJson(result);
  } catch (err) {
    Logger.log("Error en doPost: " + err.toString());
    if (e && e.parameter && e.parameter.transport === 'iframe') {
      return wrapAsPostMessage_({ error: err.message }, (e.parameter.rid || ""));
    }
    return corsJson({ error: err.message });
  }
}

function wrapAsPostMessage_(data, rid) {
  var safe = JSON.stringify({ rid: rid || "", data: data }).replace(/</g, '\\u003c');
  var html =
    '<!doctype html><html><body>\n' +
    '<script>(function(){try{var msg=' + safe + ';parent.postMessage(msg,"*");}catch(e){}})();</script>\n' +
    'OK</body></html>';

  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function corsJson(data) {
  const out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  out.setHeader('Access-Control-Allow-Origin', '*');
  out.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  out.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return out;
}

function doOptions() {
  const out = ContentService.createTextOutput('');
  out.setMimeType(ContentService.MimeType.TEXT);
  out.setHeader('Access-Control-Allow-Origin', '*');
  out.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  out.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return out;
}

function askAIProxy(conversation, systemInstruction) {
  try {
    const ss = SpreadsheetApp.openById('1chdXUT5JeHwsbAkQA3XoB4px6SjJ4C4IHJM9fBEZhik');
    const sheet = ss.getSheetByName('Hoja 1');
    if (!sheet) {
      throw new Error("No se encontró la 'Hoja 1' para leer la API Key.");
    }
    const apiKey = sheet.getRange('P1').getValue();
    if (!apiKey) {
      throw new Error('La celda P1 de la Hoja 1 no contiene la API Key de Gemini.');
    }

    const contents = Array.isArray(conversation)
      ? conversation
      : [{ role: 'user', parts: [{ text: String(conversation) }] }];

    const payload = { contents: contents };
    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
    const options = {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const data = JSON.parse(response.getContentText());
    const text = (data && data.candidates && data.candidates[0] && data.candidates[0].content &&
                  data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
                  data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : '';

    return { text: text, raw: data };
  } catch (e) {
    Logger.log('Error en askAIProxy: ' + e.toString());
    return { error: 'Hubo un error al contactar a la IA: ' + e.message };
  }
}

function saveToSheetAndNotify(data) {
  try {
    const ss = SpreadsheetApp.openById('1chdXUT5JeHwsbAkQA3XoB4px6SjJ4C4IHJM9fBEZhik');
    const sheet = ss.getSheetByName('Hoja 1');

    if (!sheet) {
      throw new Error('No se encontró la hoja con el nombre "Hoja 1".');
    }

    const boliviaTime = Utilities.formatDate(new Date(), "America/La_Paz", "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([
      boliviaTime,
      data && data.empresaClave || '',
      data && data.proyectoId || '',
      data && data.correoSST || '',
      data && data.correoMA || '',
      data && data.correoRSE || '',
      data && data.carpeta || '',
      data && data.correoEmp || '',
      data && data.correoResp || ''
    ]);

    const correos = [data && data.correoSST, data && data.correoMA, data && data.correoRSE, data && data.correoResp, data && data.correoEmp]
      .filter(Boolean);
    if (correos.length > 0) {
      const body = 'Se registró la revisión del proyecto ' + (data && data.proyectoId || '') +
                   '. Carpeta: ' + (data && data.carpeta || '') +
                   '\n\nPara seguimiento, use el enlace proporcionado y regístrese con su correo.';
      MailApp.sendEmail(
        correos.join(','),
        'Revisión pendiente: ' + (data && data.proyectoId || ''),
        body
      );
    }

    return { status: "ok", message: "Datos guardados y notificación enviada." };
  } catch (error) {
    Logger.log("Error en saveToSheetAndNotify: " + error.toString());
    return { error: error.message };
  }
}
