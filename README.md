# SF Log Agent — Agent IA pour Event Monitoring Logs Salesforce

Interface de chat intelligente qui analyse vos Event Monitoring Logs Salesforce,
détecte les anomalies, explique les erreurs et propose des actions correctives.

---

## Installation locale (5 minutes)

### 1. Prérequis
- Node.js 18+ → https://nodejs.org
- Une clé API Anthropic → https://console.anthropic.com

### 2. Installer et lancer
```bash
# Cloner ou dézipper le projet
cd sf-log-agent

# Installer les dépendances
npm install

# Configurer la clé API
cp .env.example .env.local
# Éditez .env.local et remplacez sk-ant-VOTRE_CLE_ICI par votre vraie clé

# Lancer en local
npm run dev
# → Ouvrez http://localhost:3000
```

---

## Déploiement sur Vercel (gratuit, 10 minutes)

### Option A — Via l'interface Vercel (recommandé)

1. Créez un compte sur https://vercel.com (gratuit)
2. Poussez le code sur GitHub :
   ```bash
   git init
   git add .
   git commit -m "Initial SF Log Agent"
   git remote add origin https://github.com/VOTRE_USERNAME/sf-log-agent.git
   git push -u origin main
   ```
3. Sur Vercel → "New Project" → importez votre repo GitHub
4. Dans "Environment Variables", ajoutez :
   - Nom : `VITE_ANTHROPIC_API_KEY`
   - Valeur : votre clé `sk-ant-...`
5. Cliquez "Deploy" → votre app est en ligne en 2 minutes

### Option B — Via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
# Suivez les instructions et ajoutez la variable d'env quand demandé
```

### Domaine personnalisé
Dans Vercel → Settings → Domains → ajoutez `votreagent.com`

---

## Sécurité importante avant de vendre

⚠️  La clé API est actuellement côté client (visible dans le navigateur).
Pour une version commerciale, ajoutez un backend :

### Backend sécurisé (Node.js / Express)
```bash
npm install express cors
```

```javascript
// server.js
const express = require('express');
const app = express();
app.use(express.json());
app.use(require('cors')());

app.post('/api/analyze', async (req, res) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY, // sécurisé côté serveur
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(req.body)
  });
  const data = await response.json();
  res.json(data);
});

app.listen(3001);
```

Dans `App.jsx`, remplacez l'URL par `http://localhost:3001/api/analyze`
et supprimez `x-api-key` du header côté client.

---

## Modèles de monétisation

### 1. SaaS par abonnement (recommandé)
Intégrez Stripe pour facturer à l'usage :

```bash
npm install stripe @stripe/stripe-js
```

Plans suggérés :
- **Starter** : 29€/mois → 500 analyses/mois
- **Pro** : 99€/mois → analyses illimitées + export PDF
- **Enterprise** : 299€/mois + connexion directe API Salesforce

Ressources :
- Stripe : https://stripe.com/docs/billing
- Stripe Checkout : https://stripe.com/docs/payments/checkout

### 2. Marketplace AppExchange Salesforce
Publiez sur AppExchange pour toucher 150 000+ clients Salesforce :
- https://partners.salesforce.com/partnerProgram/s/

### 3. Facturation à l'usage (Pay-as-you-go)
Comptez les tokens utilisés et facturez :
- Claude Sonnet coûte ~$3/million de tokens en entrée
- Facturez 10-20x le coût API → marge de 90%+

### 4. Services professionnels
- Audit de sécurité Salesforce : 500-2000€/rapport
- Intégration sur mesure : 150-300€/heure
- Formation : 1000-3000€/session

---

## Fonctionnalités à ajouter pour augmenter la valeur

- [ ] Connexion directe à l'API Salesforce (OAuth 2.0)
- [ ] Alertes email/Slack automatiques
- [ ] Export PDF des rapports d'analyse
- [ ] Tableau de bord des tendances sur 30 jours
- [ ] Authentification utilisateurs (Auth0, Supabase)
- [ ] Multi-org Salesforce
- [ ] Règles personnalisées de détection

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 18 + Vite |
| IA | Claude claude-sonnet-4-20250514 (Anthropic) |
| Déploiement | Vercel (gratuit) |
| Paiements | Stripe (à ajouter) |
| Auth | Supabase ou Auth0 (à ajouter) |

---

## Support

Pour toute question sur le déploiement ou la monétisation,
consultez la documentation Anthropic : https://docs.anthropic.com
