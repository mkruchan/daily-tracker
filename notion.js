exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DB = process.env.NOTION_DB;

  if (!NOTION_TOKEN || !NOTION_DB) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing NOTION_TOKEN or NOTION_DB env vars' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { date, score, metrics, mood, note } = body;

    const properties = {
      "Name": { "title": [{ "text": { "content": date } }] },
      "Date": { "date": { "start": date } },
      "Score": { "number": score },
      "Sleep": { "number": metrics.sleep },
      "Nutrition": { "number": metrics.nutrition },
      "Activity": { "number": metrics.activity },
      "Focus": { "number": metrics.focus },
      "Learning": { "number": metrics.learning },
      "Procrastination": { "number": metrics.procrastination },
      "Mood": { "rich_text": [{ "text": { "content": mood || '' } }] },
      "Note": { "rich_text": [{ "text": { "content": note || '' } }] }
    };

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DB },
        properties
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: data.message || 'Notion error' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
