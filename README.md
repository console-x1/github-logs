# 📣 GitHub logs

Ce code recoit les **webhooks de commits GitHub** et envoie automatiquement des **embeds formatés** dans un **salon Discord** via un webhook. Idéal pour suivre en temps réel les modifications d’un dépôt GitHub !

---

## 🚀 Fonctionnalités

* Récupère les commits envoyés par GitHub (via `/github`).
* Formatage clair des fichiers **ajoutés 🟢**, **modifiés 🟡**, **supprimés 🔴**.
* Affiche le **nom et l'avatar GitHub** de l'auteur du commit.
* Envoie une notification élégante et structurée dans **Discord**.

---

## 🔧 Installation

```bash
git clone https://github.com/console-x1/github-logs.git
cd github-logs
npm install
```

---

## ⚙️ Configuration

1. Ouvre `index.js` (ou autre nom de fichier si différent).
2. Remplace :

```js
const DISCORD_WEBHOOK_URL = 'WEBHOOK';
```

par l’URL de ton webhook Discord :

```js
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/TON_WEBHOOK';
```

---

## 🛠️ Utilisation

### 1. Lancer le serveur

```bash
node index.js
```

> Par défaut, le serveur écoute sur le port `3000` tu peux changer ça à la ligne 6.

---

### 2. Ajouter un webhook GitHub

Dans ton dépôt GitHub :

1. Va dans **Settings** → **Webhooks** → **Add webhook**.
2. **Payload URL** : `http://TON_IP_OU_DOMAINE:3000/github`
3. **Content type** : `application/json`
4. **Events** : sélectionne **"Just the push event"**
5. Clique sur **"Add webhook"**

---

## 📡 Exemple de message Discord

> 🆕 Nouveau Commit sur `user/mon-repo`
> **Auteur :** Jean Dupont (jeandupont)
> **Message :** Ajout de la fonction X
>
> ```
> 🟢 Ajoutés:
>   → nouveau-fichier.js
>
> 🟡 Modifiés:
>   → script.js
> ```

---

## 📄 Licence

MIT — Utilise ce projet librement, mais garde une mention si tu le partages.