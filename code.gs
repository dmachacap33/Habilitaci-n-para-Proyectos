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
    } else if (action === 'sendActionEmail') {
      result = sendActionEmail(params.data);
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

function sendActionEmail(data) {
  try {
    const ss = SpreadsheetApp.openById('1chdXUT5JeHwsbAkQA3XoB4px6SjJ4C4IHJM9fBEZhik');
    const sheet = ss.getSheetByName('Hoja 1');
    if (!sheet) {
      throw new Error('No se encontró la hoja con el nombre "Hoja 1".');
    }
    const boliviaTime = Utilities.formatDate(new Date(), 'America/La_Paz', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([
      boliviaTime,
      data && data.empresaClave || '',
      data && data.proyectoId || '',
      data && data.correoSST || '',
      data && data.correoMA || '',
      data && data.correoRSE || '',
      data && data.carpeta || '',
      data && data.correoEmp || '',
      data && data.correoResp || '',
      data && data.accion || ''
    ]);

    // Determinar destinatarios. Se acepta una cadena con correos separados
    // por coma o punto y coma, o bien un arreglo de correos.
    let correos = [];
    if (data && data.destinatarios) {
      if (Array.isArray(data.destinatarios)) {
        correos = data.destinatarios;
      } else {
        correos = String(data.destinatarios)
          .split(/[;,]/)
          .map(s => s.trim())
          .filter(Boolean);
      }
    } else {
      correos = [
        data && data.correoSST,
        data && data.correoMA,
        data && data.correoRSE,
        data && data.correoResp,
        data && data.correoEmp
      ].filter(Boolean);
    }

    if (correos.length === 0) {
      return { status: 'sin_destinatarios' };
    }

    // Definir asunto y cuerpo del mensaje.
    const subject = data.asunto || `${data.accion || 'Acción'} ${data.empresaClave || ''} ${data.proyectoId || ''}`;
    let body = data.cuerpo || '';
    if (!body) {
      if (data.accion === 'Recibido') {
        body = 'Se registró la recepción del proyecto ' + (data.proyectoId || '') + '. Carpeta: ' + (data.carpeta || '');
      } else if (data.accion === 'Notificación') {
        body = 'Usted está asignado para revisar la carpeta del proyecto ' + (data.proyectoId || '') + '.\n\nCarpeta: ' + (data.carpeta || '');
      } else if (data.accion === 'Devolución') {
        body = 'La carpeta del proyecto ' + (data.proyectoId || '') + ' ha sido devuelta.';
      } else {
        body = 'Se registró la acción ' + (data.accion || '') + ' para el proyecto ' + (data.proyectoId || '') + '.';
      }
    }

    const options = {
      to: correos.join(','),
      subject: subject,
      body: body,
      htmlBody: body.replace(/\n/g, '<br>')
    };

    // Adjuntar PDF generado a partir del HTML si está disponible.
    if (data.pdfHtml) {
      const pdfBlob = Utilities.newBlob(data.pdfHtml, 'text/html', 'reporte.html')
        .getAs('application/pdf')
        .setName(`reporte_${data.empresaClave || ''}_${data.proyectoId || ''}.pdf`);
      options.attachments = [pdfBlob];
    }

    MailApp.sendEmail(options);

    return { status: 'ok', message: 'Acción registrada y correo enviado.' };
  } catch (error) {
    Logger.log('Error en sendActionEmail: ' + error.toString());
    return { error: error.message };
  }
}
