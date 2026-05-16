exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;

  if (!NOTION_TOKEN) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Missing NOTION_TOKEN env var' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { dbid, date, score, metrics, mood, note, test } = body;

    if (!dbid) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing database ID' })
      };
    }

    // Grade system
    function getGrade(s) {
      if (s >= 9.5) return { emoji: '⚡', label: 'Perfect' };
      if (s >= 8.5) return { emoji: '🔥', label: 'Excellent' };
      if (s >= 7.0) return { emoji: '💪', label: 'Good' };
      if (s >= 6.0) return { emoji: '🙂', label: 'Decent' };
      if (s >= 5.0) return { emoji: '😐', label: 'Average' };
      if (s >= 3.0) return { emoji: '😞', label: 'Weak' };
      return { emoji: '💀', label: 'Total Procrastination' };
    }

    // Format date for title: "Sat May 16"
    function formatDateShort(str) {
      try {
        const d = new Date(str + 'T12:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      } catch (e) {
        return str;
      }
    }

    const grade = getGrade(score);
    const dateLabel = formatDateShort(date);
    // Title: "🔥 Excellent — 8.7 · Sat May 16"
    const pageTitle = test
      ? '🧪 Test entry'
      : `${grade.emoji} ${grade.label} — ${Number(score).toFixed(1)} · ${dateLabel}`;

    const properties = {
      "Mood": {
        "title": [{ "text": { "content": pageTitle } }]
      },
      "Date": {
        "date": { "start": test ? new Date().toISOString().split('T')[0] : date }
      },
      "Score": { "number": test ? 0 : score },
      "Sleep": { "number": test ? 0 : metrics.sleep },
      "Nutrition": { "number": test ? 0 : metrics.nutrition },
      "Activity": { "number": test ? 0 : metrics.activity },
      "Focus": { "number": test ? 0 : metrics.focus },
      "Learning": { "number": test ? 0 : metrics.learning },
      "Procrastination": { "number": test ? 0 : metrics.procrastination },
      "Note": {
        "rich_text": [{ "text": { "content": note || '' } }]
      }
    };

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: dbid.replace(/-/g, '') },
        properties
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: data.message || 'Notion API error' })
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
