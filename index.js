const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000
const SECRET = "" // Pas obligatoire
const DISCORD_WEBHOOK_URL = "" // Url du webhook discord

if (SECRET) {
    app.use(bodyParser.json({
        verify: (req, res, buf) => {
            req.rawBody = buf.toString();
        }
    }));
} else {
    app.use(bodyParser.json())
}

function verifySignature(req) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) return false;

    const hmac = crypto.createHmac('sha256', SECRET);
    const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

async function getAvatarFromUsername(username) {
    if (!username) return null;
    try {
        const response = await axios.get(`https://api.github.com/users/${username}`);
        return response.data.avatar_url;
    } catch {
        return null;
    }
}


app.post('/github', async (req, res) => {
    if (SECRET && !verifySignature(req)) {
        console.log('⚠️ Signature invalide. Requête rejetée.');
        return res.status(401).send('Invalid signature');
    }
    const eventType = req.headers['x-github-event'];
    const payload = req.body;

    const repoName = payload.repository?.full_name;
    const embeds = [];

    // 🔁 PUSH (commits)
    if (eventType === 'push' && payload.commits) {
        for (const commit of payload.commits) {
            const authorName = commit.author.name;
            const authorUsername = commit.author.username;
            const avatarUrl = await getAvatarFromUsername(authorUsername) || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';

            const message = commit.message;

            const formatList = (emoji, label, list) => {
                if (!list.length) return '';
                const lines = list.map(file => `  →  ${file}`).join(',\n');
                return ` ${emoji} ${label}:\n${lines}\n`;
            };

            const fileChanges =
                '```\n' +
                formatList('🟢', 'Ajoutés', commit.added) +
                (commit.added.length && (commit.modified.length || commit.removed.length) ? '\n' : '') +
                formatList('🟡', 'Modifiés', commit.modified) +
                (commit.modified.length && commit.removed.length ? '\n' : '') +
                formatList('🔴', 'Supprimés', commit.removed) +
                '```';

            const description = [
                `**🆕 Nouveau Commit sur \`${repoName}\`**`,
                `**Auteur :** \`${authorName} (${authorUsername || 'anonyme'})\``,
                `**Message :** \`${message}\``,
                '',
                fileChanges
            ].join('\n');

            embeds.push({
                color: "#2050ff",
                author: {
                    name: authorName,
                    icon_url: avatarUrl,
                    url: authorUsername ? `https://github.com/${authorUsername}` : undefined
                },
                description,
                timestamp: commit.timestamp,
                url: commit.url
            });
        }
    }

    // ⭐ STAR
    else if (eventType === 'star') {
        const action = payload.action;
        const sender = payload.sender;
        const avatarUrl = sender.avatar_url;

        embeds.push({
            title: `⭐ Nouveau ${action === 'created' ? 'star' : 'unstar'} sur le repo !`,
            description: `**${sender.login}** a ${action === 'created' ? 'ajouté' : 'retiré'} une étoile à \`${repoName}\`.`,
            color: action === 'created' ? "#ffde59" : "#ff0000",
            author: {
                name: sender.login,
                icon_url: avatarUrl,
                url: `https://github.com/${sender.login}`
            },
            timestamp: new Date().toISOString()
        });
    }

    // 💬 ISSUE
    else if (eventType === 'issues') {
        const action = payload.action;
        const issue = payload.issue;
        const sender = payload.sender;

        embeds.push({
            title: `💬 Issue ${action} : #${issue.number}`,
            description: `**${sender.login}** a ${action} une issue sur \`${repoName}\`\n\n` +
                `**Titre :** ${issue.title}\n` +
                (issue.body ? `\n> ${issue.body}` : ''),
            color: 0x00CC99,
            url: issue.html_url,
            author: {
                name: sender.login,
                icon_url: sender.avatar_url
            },
            timestamp: issue.created_at
        });
    }

    // 🔀 PULL REQUEST
    else if (eventType === 'pull_request') {
        const pr = payload.pull_request;
        const action = payload.action;
        const sender = payload.sender;

        embeds.push({
            title: `🔀 Pull Request ${action} : #${pr.number}`,
            description: `**${sender.login}** a ${action} une PR sur \`${repoName}\`\n\n` +
                `**Titre :** ${pr.title}\n` +
                (pr.body ? `\n> ${pr.body}` : ''),
            color: 0x9932CC,
            url: pr.html_url,
            author: {
                name: sender.login,
                icon_url: sender.avatar_url
            },
            timestamp: pr.created_at
        });
    }

    // En cas de motif d'un repo
    else if (eventType === 'repository') {
        if (payload.action === 'created') {
            const repo = payload.repository;
            const sender = payload.sender;

            embeds.push({
                title: `📦 Nouveau dépôt créé : ${repo.full_name}`,
                description: repo.description || '_Pas de description_',
                url: repo.html_url,
                color: "#00ff00",
                author: {
                    name: sender.login,
                    icon_url: sender.avatar_url,
                    url: `https://github.com/${sender.login}`
                },
                timestamp: new Date().toISOString()
            });
        }
        else if (payload.action === 'deleted') {
            const repo = payload.repository;
            const sender = payload.sender;

            embeds.push({
                title: `📦 Dépôt supprimée : ${repo.full_name}`,
                description: repo.description || '_Pas de description_',
                url: repo.html_url,
                color: "#ff0000",
                author: {
                    name: sender.login,
                    icon_url: sender.avatar_url,
                    url: `https://github.com/${sender.login}`
                },
                timestamp: new Date().toISOString()
            });
        }
    }

    if (!embeds.length) {
        return res.status(200).send('Aucun embed généré pour cet événement.');
    }

    try {
        await axios.post(DISCORD_WEBHOOK_URL, {
            username: 'GitHub Notifier',
            embeds
        });
        res.sendStatus(200);
    } catch (error) {
        console.error('Erreur Discord Webhook :', error.message);
        res.sendStatus(500);
    }
});

app.listen(PORT, () => {
    console.log(`✅ Serveur en écoute sur le port ${PORT}`);
});
