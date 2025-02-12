# SettleUp

SettleUp è una web app che semplifica la gestione delle spese di gruppo. Gli utenti possono creare gruppi, aggiungere partecipanti e tenere traccia dei pagamenti effettuati da ciascun membro. L'applicazione è sviluppata utilizzando Node.js, Express e MongoDB.

## Tecnologie Utilizzate
- **Backend**: Node.js, Express.js, Mongoose
- **Database**: MongoDB
- **Frontend**: EJS (Embedded JavaScript), CSS
- **Librerie Aggiuntive**: method-override, ejs-mate

## Funzionalità Principali
- Creazione, visualizzazione e modifica di gruppi di spesa
- Aggiunta di partecipanti ai gruppi
- Gestione delle transazioni
- Interfaccia semplice e intuitiva

## Installazione e Avvio
1. **Clona la repository**
   ```bash
   git clone <repository-url>
   cd SettleUp
   ```
2. **Installa le dipendenze**
   ```bash
   npm install
   ```
3. **Avvia il database MongoDB** (assicurati di averlo installato)
   ```bash
   mongosh
   ```
4. **Avvia il server**
   ```bash
   node index.js
   ```
5. **Accedi all'app**
   Apri il browser e vai su `http://localhost:3000`

## Struttura del Progetto
```
SettleUp/
│── models/              # Modelli Mongoose per Group e Transaction
│── public/              # File statici (CSS, immagini)
│── views/               # Template EJS
│── index.js             # Server Express
│── package.json         # Dipendenze del progetto
│── README.md            # Documentazione
```

## Prossimi Sviluppi
- Implementazione di un sistema di autenticazione
- Creazione di una dashboard per riepilogare le spese
- Versione mobile con Flutter

## Autore
Nicolas Maule
