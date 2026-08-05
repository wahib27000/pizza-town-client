// ==========================================
// 1. CONFIGURATION & VARIABLES GLOBALES
// ==========================================
const API_URL = "https://pizza-town-backend-1.onrender.com";
let modeCommandeActuel = 'livraison';
let panier = [];
let produits = [];
let codePromoApplique = null; // Stocke la réduction active

// NOUVEAU : GESTION DU COMPTE CLIENT
let currentUser = JSON.parse(localStorage.getItem('pizzaTownUser') || 'null');
let authToken = localStorage.getItem('pizzaTownToken');

// Chargement du panier sauvegardé
const panierSauvegarde = localStorage.getItem('panierPizzaTown');
if (panierSauvegarde) {
    panier = JSON.parse(panierSauvegarde);
}

// ==========================================
// 1.1 KILL-SWITCH HORAIRE (Vérification si ouvert)
// ==========================================
function verifierSiOuvert() {
    const now = new Date();
    const day = now.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const timeInMins = hour * 60 + minutes;

    // Horaires Pizza Town :
    // Lundi - Jeudi : 11:30 - 14:30 (690 - 870) et 18:00 - 23:00 (1080 - 1380)
    // Vendredi - Samedi : 11:30 - 14:30 (690 - 870) et 18:00 - 00:00 (1080 - 1440)
    // Dimanche : 18:00 - 23:00 (1080 - 1380)
    let estOuvert = false;

    if (day >= 1 && day <= 4) {
        estOuvert = (timeInMins >= 690 && timeInMins <= 870) || (timeInMins >= 1080 && timeInMins <= 1380);
    } else if (day === 5 || day === 6) {
        estOuvert = (timeInMins >= 690 && timeInMins <= 870) || (timeInMins >= 1080 && timeInMins <= 1440);
    } else if (day === 0) {
        estOuvert = (timeInMins >= 1080 && timeInMins <= 1380);
    }

    return true; // ⚠️ Laisse 'true' pour tester à tout moment, ou remplace par 'estOuvert' pour bloquer la nuit
}

// ==========================================
// 2. RÉCUPÉRATION DU MENU DEPUIS LE BACKEND
// ==========================================
async function chargerMenuDepuisAPI(categorieFiltre = 'tous') {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        produits = await response.json();
        afficherMenu(categorieFiltre);
    } catch (err) {
        console.error("Erreur de chargement du catalogue :", err);
    }
}

// ==========================================
// 3. AFFICHAGE ET GESTION DU MENU
// ==========================================
const grillePizzas = document.getElementById('grille-pizzas');

function afficherMenu(categorieFiltre = 'tous') {
    if (!grillePizzas) return;
    grillePizzas.innerHTML = "";
    
    const produitsFiltres = produits.filter(p => 
        p.disponible !== false && 
        (categorieFiltre === 'tous' || p.categorie === categorieFiltre)
    );

    if (produitsFiltres.length === 0) {
        grillePizzas.innerHTML = `<p style="text-align: center; color: #888; grid-column: 1/-1; padding: 40px;">Aucun produit disponible dans cette catégorie pour le moment.</p>`;
        return;
    }
    
    produitsFiltres.forEach(produit => {
        const carte = document.createElement('div');
        carte.classList.add('pizza-card');
        carte.style.position = 'relative';
        
        let badgeNewHTML = '';
        if (produit.createdAt) {
            const dateCreation = new Date(produit.createdAt);
            const aujourdHui = new Date();
            const diffJours = (aujourdHui - dateCreation) / (1000 * 60 * 60 * 24);
            if (diffJours <= 21) {
                badgeNewHTML = `<span style="position: absolute; top: 10px; right: 10px; background: #E63946; color: white; padding: 3px 8px; font-size: 0.7rem; font-weight: bold; border-radius: 4px; z-index: 2;">NEW 🍕</span>`;
            }
        }

        let optionsTailleHTML = '';
        let affichagePrixHTML = '';

        if (produit.categorie === 'pizzas' && produit.prixBase) {
            optionsTailleHTML = `
                <div class="taille-selector" style="display: flex; gap: 5px; margin: 12px 0;">
                    <label style="flex: 1; text-align: center; font-size: 0.75rem; font-weight: bold; padding: 6px 2px; background: #f1f1f1; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                        <input type="radio" name="taille-${produit._id}" value="junior" style="display:none;" onchange="changerPrixPizza('${produit._id}', ${(produit.prixBase - 3.90).toFixed(2)}, this)">
                        Junior<br><span style="font-weight: normal; color: #666;">${(produit.prixBase - 3.90).toFixed(2)}€</span>
                    </label>
                    <label style="flex: 1; text-align: center; font-size: 0.75rem; font-weight: bold; padding: 6px 2px; background: #E63946; color: white; border-radius: 6px; cursor: pointer; transition: all 0.2s;" class="taille-active">
                        <input type="radio" name="taille-${produit._id}" value="senior" checked style="display:none;" onchange="changerPrixPizza('${produit._id}', ${produit.prixBase}, this)">
                        Senior<br><span style="font-weight: normal; color: #ffe5e7;">${produit.prixBase.toFixed(2)}€</span>
                    </label>
                    <label style="flex: 1; text-align: center; font-size: 0.75rem; font-weight: bold; padding: 6px 2px; background: #f1f1f1; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                        <input type="radio" name="taille-${produit._id}" value="mega" style="display:none;" onchange="changerPrixPizza('${produit._id}', ${(produit.prixBase + 6.00).toFixed(2)}, this)">
                        Méga<br><span style="font-weight: normal; color: #666;">${(produit.prixBase + 6.00).toFixed(2)}€</span>
                    </label>
                </div>
            `;
            affichagePrixHTML = `<div class="pizza-prix" id="prix-affichage-${produit._id}">${produit.prixBase.toFixed(2)} €</div>`;
        } else {
            const prixFixe = produit.prixFixe || produit.prixBase || 0;
            affichagePrixHTML = `<div class="pizza-prix">${prixFixe.toFixed(2)} €</div>`;
        }
        
        carte.innerHTML = `
            ${badgeNewHTML}
            <img src="${produit.image}" alt="${produit.nom}" onerror="this.src='https://via.placeholder.com/300x200?text=Pizza+Town'">
            <h4 class="pizza-nom">${produit.nom}</h4>
            <p style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">${produit.desc}</p>
            ${optionsTailleHTML}
            ${affichagePrixHTML}
            <button class="add-btn" onclick="ajouterAuPanier('${produit._id}', this)">Ajouter au panier</button>
        `;
        
        grillePizzas.appendChild(carte);
    });
}

function changerPrixPizza(idProduit, nouveauPrix, elementInput) {
    const prixAffichage = document.getElementById(`prix-affichage-${idProduit}`);
    if (prixAffichage) prixAffichage.innerText = Number(nouveauPrix).toFixed(2) + " €";
    
    const conteneur = elementInput.closest('.taille-selector');
    if (!conteneur) return;
    conteneur.querySelectorAll('label').forEach(label => {
        label.classList.remove('taille-active');
        if (!document.body.classList.contains('dark-mode')) {
            label.style.background = '#f1f1f1';
            label.style.color = '#333';
        } else {
            label.style.background = '#2d2d2d';
            label.style.color = '#ccc';
        }
    });
    
    const labelActif = elementInput.closest('label');
    labelActif.classList.add('taille-active');
    labelActif.style.background = '#E63946';
    labelActif.style.color = 'white';
}

function filtrerCategorie(categorie) {
    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    afficherMenu(categorie);
}

// ==========================================
// 4. RECHERCHE EN DIRECT
// ==========================================
const inputRecherche = document.getElementById('input-recherche');
if (inputRecherche) {
    inputRecherche.addEventListener('input', (e) => {
        const termeRecherche = e.target.value.toLowerCase().trim();
        const cartesProduits = grillePizzas.children;
        Array.from(cartesProduits).forEach(carte => {
            const texteCarte = carte.innerText.toLowerCase();
            if (texteCarte.includes(termeRecherche)) {
                carte.style.display = "block";
            } else {
                carte.style.display = "none";  
            }
        });
    });
}

// ==========================================
// 5. GESTION DU PANIER & PROMOTIONS
// ==========================================
function ajouterAuPanier(idProduit, btnElement) {
    const produitTrouve = produits.find(p => p._id === idProduit);
    if (!produitTrouve) return;

    let prixFinal = 0;
    let nomFinal = produitTrouve.nom;

    if (produitTrouve.categorie === 'pizzas' && produitTrouve.prixBase) {
        const carteParente = btnElement.closest('.pizza-card');
        const radioCoche = carteParente ? carteParente.querySelector(`input[name="taille-${idProduit}"]:checked`) : null;
        const tailleChoisie = radioCoche ? radioCoche.value : 'senior';

        if (tailleChoisie === 'junior') {
            prixFinal = produitTrouve.prixBase - 3.90;
            nomFinal += " (Junior)";
        } else if (tailleChoisie === 'senior') {
            prixFinal = produitTrouve.prixBase;
            nomFinal += " (Senior)";
        } else if (tailleChoisie === 'mega') {
            prixFinal = produitTrouve.prixBase + 6.00;
            nomFinal += " (Méga)";
        }
    } else {
        prixFinal = produitTrouve.prixFixe || produitTrouve.prixBase || 0;
    }

    panier.push({ nom: nomFinal, prix: prixFinal, prixOriginal: prixFinal, options: [] });
    mettreAJourPanier();

    const texteOriginal = btnElement.innerHTML;
    btnElement.classList.add('success');
    btnElement.innerHTML = "✓ Ajouté !";

    setTimeout(() => {
        btnElement.classList.remove('success');
        btnElement.innerHTML = texteOriginal;
    }, 1000);

    const boutonPanierFlottant = document.getElementById('btn-ouvrir-panier');
    if (boutonPanierFlottant) {
        boutonPanierFlottant.classList.add('panier-pulse');
        setTimeout(() => {
            boutonPanierFlottant.classList.remove('panier-pulse');
        }, 600);
    }
}

function appliquerPromosAutomatiques(itemsPanier) {
    const now = new Date();
    const dayOfWeek = now.getDay(); 
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    const timeInMinutes = currentHour * 60 + currentMinutes;
    const isEvening = timeInMinutes >= 1080 && timeInMinutes <= 1380;
    const isTakeaway = (modeCommandeActuel === 'emporter');
    const isTuesdayEvening = (dayOfWeek === 2) && isEvening;
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    let panierMaj = itemsPanier.map(article => {
        let prixOriginal = article.prixOriginal !== undefined ? article.prixOriginal : article.prix;
        return { ...article, prixOriginal: prixOriginal, prix: prixOriginal, promoappliquee: null };
    });

    if (isTuesdayEvening && isTakeaway) {
        panierMaj.forEach(article => {
            if (article.nom.includes("(Senior)")) {
                article.prix = 10.00;
                article.promoappliquee = "Promo Mardi : Senior à 10€";
            }
        });
    }

    if (isWeekday && isTakeaway) {
        let pizzasEligibles = [];
        panierMaj.forEach((article, index) => {
            if ((article.nom.includes("(Senior)") || article.nom.includes("(Méga)")) && !article.promoappliquee) {
                pizzasEligibles.push({ index: index, prix: article.prixOriginal });
            }
        });

        pizzasEligibles.sort((a, b) => a.prix - b.prix);

        if (pizzasEligibles.length >= 2) {
            const pairesCount = Math.floor(pizzasEligibles.length / 2);
            for (let i = 0; i < pairesCount; i++) {
                const idxMoinsChere = pizzasEligibles[i].index;
                panierMaj[idxMoinsChere].prix = panierMaj[idxMoinsChere].prixOriginal * 0.5;
                panierMaj[idxMoinsChere].promoappliquee = "2ème pizza à -50%";
            }
        }
    }
    return panierMaj;
}

// Fonction de vérification du code promo sécurisée (évite le plantage undefined)
async function verifierCodePromo() {
    const inputCode = document.getElementById('input-code-promo');
    if (!inputCode) return;
    const codeSaisi = inputCode.value.trim().toUpperCase();

    if (!codeSaisi) {
        afficherNotification("⚠️ Veuillez entrer un code promo.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/promos`);
        if (!res.ok) throw new Error("Erreur serveur");
        
        const promos = await res.json();
        
        // Recherche ultra-sécurisée : vérifie que p et p.code existent pour éviter les plantages
        const promoTrouvee = promos.find(p => p && p.code && p.code.toUpperCase() === codeSaisi);

        if (promoTrouvee) {
            codePromoApplique = promoTrouvee;
            afficherNotification(`🎟️ Code promo "${promoTrouvee.code}" appliqué (-${promoTrouvee.valeur}€) !`);
            mettreAJourPanier();
        } else {
            afficherNotification("❌ Code promo invalide ou expiré.");
            codePromoApplique = null;
            mettreAJourPanier();
        }
    } catch (err) {
        console.error("Erreur promo :", err);
        afficherNotification("❌ Erreur lors de la vérification du code.");
    }
}

function mettreAJourPanier() {
    let panierTraite = appliquerPromosAutomatiques(panier);
    const compteur = document.getElementById('compteur-panier');
    if (compteur) compteur.innerText = panier.length;
    
    const listeArticles = document.getElementById('liste-articles-panier');
    if (!listeArticles) return;
    listeArticles.innerHTML = "";
    
    let total = 0;

    if (panier.length === 0) {
        listeArticles.innerHTML = `<p style="text-align: center; color: #888; padding: 30px; font-size: 0.95rem;">Votre panier est vide 🍕</p>`;
        const prixTotalEl = document.getElementById('prix-total');
        if (prixTotalEl) prixTotalEl.innerText = "0.00 €";
        const btnPayerEl = document.getElementById('btn-payer');
        if (btnPayerEl) btnPayerEl.innerText = "Commander";
        codePromoApplique = null;
        localStorage.removeItem('panierPizzaTown');
        return;
    }
    
    panierTraite.forEach((article, index) => {
        total += article.prix;
        panier[index].prix = article.prix; 
        const ligne = document.createElement('div');
        ligne.classList.add('panier-item');
        
        let badgePromoHTML = article.promoappliquee ? `<br><span style="font-size: 0.7rem; background: #2a9d8f; color: white; padding: 2px 6px; border-radius: 4px;">${article.promoappliquee}</span>` : '';
        let optionsHtml = (article.options && article.options.length > 0) ? `<br><span style="font-size: 0.75rem; color: #e0a96d;">↳ ${article.options.join(', ')}</span>` : '';

        ligne.innerHTML = `
            <div class="panier-item-infos">
                <span class="panier-item-nom">${article.nom} ${badgePromoHTML} ${optionsHtml}</span>
                <span class="panier-item-prix">${article.prix.toFixed(2)} €</span>
            </div>
            <button class="panier-btn-supprimer" onclick="retirerDuPanier(${index})" title="Supprimer">✕</button>
        `;
        listeArticles.appendChild(ligne);
    });

    if (codePromoApplique) {
        total -= codePromoApplique.valeur;
        if (total < 0) total = 0;
        const lignePromo = document.createElement('div');
        lignePromo.style.cssText = "font-size: 0.85rem; color: #2a9d8f; margin: 10px 0; font-weight: bold; text-align: center;";
        lignePromo.innerText = `🎟️ Remise promo (${codePromoApplique.code}) : -${codePromoApplique.valeur.toFixed(2)} €`;
        listeArticles.appendChild(lignePromo);
    }
    
    const prixTotalEl = document.getElementById('prix-total');
    if (prixTotalEl) prixTotalEl.innerText = total.toFixed(2) + " €";
    const btnPayerEl = document.getElementById('btn-payer');
    if (btnPayerEl) btnPayerEl.innerText = `Commander (${total.toFixed(2)} €)`;
    localStorage.setItem('panierPizzaTown', JSON.stringify(panier));
}

function retirerDuPanier(index) {
    panier.splice(index, 1);
    mettreAJourPanier();
}

// ==========================================
// 6. NOUVEAU : GESTION COMPTE CLIENT & AUTHENTIFICATION
// ==========================================
function mettreAJourUICompte() {
    const btnCompte = document.getElementById('btn-compte');
    if (!btnCompte) return;
    
    if (currentUser) {
        // Afficher le prénom du client
        const prenom = currentUser.nom.split(' ')[0];
        btnCompte.innerHTML = `👤 ${prenom}`;
        btnCompte.style.borderColor = '#2a9d8f';
        btnCompte.style.color = '#2a9d8f';
    } else {
        btnCompte.innerHTML = `👤 Mon Compte`;
        btnCompte.style.borderColor = '#333';
        if (!document.body.classList.contains('dark-mode')) {
            btnCompte.style.color = 'inherit';
        }
    }
}

function gererClicCompte() {
    fermerModalesAuth();
    if (currentUser) {
        // Remplir le Dashboard client premium
        document.getElementById('acc-prenom').innerText = currentUser.nom.split(' ')[0];
        document.getElementById('acc-nom').innerText = currentUser.nom;
        document.getElementById('acc-email').innerText = currentUser.email;
        document.getElementById('acc-tel').innerText = currentUser.telephone || 'Non renseigné';
        document.getElementById('acc-adresse').innerText = (currentUser.adresse && currentUser.ville) ? `${currentUser.adresse}, ${currentUser.ville}` : 'Non renseignée';
        
        document.getElementById('modal-account').classList.remove('cache');
        
        // Lancer la récupération de l'historique
        chargerHistoriqueClient();
    } else {
        document.getElementById('modal-login').classList.remove('cache');
    }
}

async function chargerHistoriqueClient() {
    const conteneur = document.getElementById('acc-historique');
    conteneur.innerHTML = '<p style="color: #888; font-style: italic; text-align: center; padding: 10px;">Chargement de vos commandes...</p>';
    
    try {
        const res = await fetch(`${API_URL}/api/orders`);
        const allOrders = await res.json();
        
        // On filtre pour ne garder que les commandes de ce client
        const mesCommandes = allOrders.filter(cmd => cmd.userId === currentUser._id);
        
        if (mesCommandes.length === 0) {
            conteneur.innerHTML = '<p style="color: #888; font-size: 0.9rem; text-align: center; padding: 10px;">Vous n\'avez pas encore passé de commande chez nous.</p>';
            return;
        }
        
        conteneur.innerHTML = ''; // On vide le texte de chargement
        
        mesCommandes.forEach(cmd => {
            const dateStr = new Date(cmd.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' });
            
            // Badge visuel dynamique selon l'état de la commande
            const estLivree = (cmd.status && cmd.status.toLowerCase().includes('livré'));
            const couleurBadge = estLivree ? '#2a9d8f' : '#f39c12';
            const texteBadge = estLivree ? 'Terminée' : (cmd.status || 'En cours');
            
            const div = document.createElement('div');
            div.style.cssText = "border: 1px solid #eaeaea; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; background: white; transition: 0.2s;";
            
            div.innerHTML = `
                <div>
                    <strong style="display: block; font-size: 0.95rem; color: #333; margin-bottom: 3px;">Commande du ${dateStr}</strong>
                    <span style="font-size: 0.8rem; color: #888; font-weight: bold; text-transform: uppercase;">${cmd.mode} - ${cmd.items.length} article(s)</span>
                </div>
                <div style="text-align: right;">
                    <strong style="display: block; color: #E63946; font-size: 1.1rem; margin-bottom: 5px;">${cmd.total.toFixed(2)} €</strong>
                    <span style="font-size: 0.7rem; background: ${couleurBadge}; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold;">${texteBadge}</span>
                </div>
            `;
            conteneur.appendChild(div);
        });
        
    } catch (err) {
        console.error(err);
        conteneur.innerHTML = '<p style="color: #E63946; font-size: 0.9rem; text-align: center;">Impossible de charger l\'historique.</p>';
    }
}

function fermerModalesAuth() {
    const login = document.getElementById('modal-login');
    const register = document.getElementById('modal-register');
    const forgot = document.getElementById('modal-forgot');
    const account = document.getElementById('modal-account');
    
    if (login) login.classList.add('cache');
    if (register) register.classList.add('cache');
    if (forgot) forgot.classList.add('cache');
    if (account) account.classList.add('cache');
}

function basculerModalAuth(target) {
    fermerModalesAuth();
    const modal = document.getElementById(`modal-${target}`);
    if (modal) modal.classList.remove('cache');
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerText = "⏳ Création...";
    
    const data = {
        nom: document.getElementById('reg-nom').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        telephone: document.getElementById('reg-tel').value,
        adresse: document.getElementById('reg-adresse').value,
        ville: document.getElementById('reg-ville').value,
        accepteNewsletter: document.getElementById('reg-newsletter').checked
    };
    
    try {
        const res = await fetch(`${API_URL}/api/auth/register`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(data) 
        });
        const result = await res.json();
        
        if (res.ok) {
            afficherNotification("✅ Compte créé avec succès ! Connectez-vous.");
            basculerModalAuth('login');
        } else { 
            afficherNotification(`❌ ${result.message}`); 
        }
    } catch (err) { 
        afficherNotification("❌ Erreur de connexion au serveur."); 
    }
    btn.innerText = oldText;
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerText = "⏳ Connexion...";
    
    const data = { 
        email: document.getElementById('login-email').value, 
        password: document.getElementById('login-password').value 
    };
    
    try {
        const res = await fetch(`${API_URL}/api/auth/login`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(data) 
        });
        const result = await res.json();
        
        if (res.ok) {
            currentUser = result.user; 
            authToken = result.token;
            localStorage.setItem('pizzaTownUser', JSON.stringify(currentUser));
            localStorage.setItem('pizzaTownToken', authToken);
            
            mettreAJourUICompte();
            fermerModalesAuth();
            afficherNotification(`👋 Bienvenue, ${currentUser.nom} !`);
            document.getElementById('form-login').reset();
        } else { 
            afficherNotification(`❌ ${result.message}`); 
        }
    } catch (err) { 
        afficherNotification("❌ Erreur de connexion au serveur."); 
    }
    btn.innerText = oldText;
}

async function handleForgot(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    try {
        await fetch(`${API_URL}/api/auth/forgot-password`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ email }) 
        });
        afficherNotification("✉️ Si l'email existe, un lien a été envoyé.");
        basculerModalAuth('login');
    } catch (err) { 
        afficherNotification("❌ Erreur serveur"); 
    }
}

function handleLogout() {
    currentUser = null; 
    authToken = null;
    localStorage.removeItem('pizzaTownUser'); 
    localStorage.removeItem('pizzaTownToken');
    mettreAJourUICompte(); 
    fermerModalesAuth();
    afficherNotification("👋 Déconnexion réussie");
}


// ==========================================
// 7. RÈGLES DE LIVRAISON
// ==========================================
const zonesLivraison = {
    "Incarville": 10, "La haye-le-comte": 10, "Louviers": 10, "Pinterville": 10,
    "Acquigny": 15, "Le vaudreuil": 15, "Saint-etienne-du-vauvray": 15, "Saint-pierre-du-vauvray": 15, "Val-de-reuil": 15, "Vironvay": 15,
    "Heudebouville": 20, "La vallee": 20, "Lery": 20, "Montaure": 20, "Surville": 20, "Tostes": 20,
    "Criquebeuf-sur-seine": 30, "Emalleville": 30, "Porte-joie": 30, "Sotteville-sous-le-val": 30, "Vieux-villez": 30,
    "Amfreville-sur-iton": 30, "Cailly-sur-eure": 30, "Connelles": 30, "Crasville": 30,
    "Fontaine-bellenger": 30, "Fontaine-heudebourg": 30, "Herqueville": 30,
    "Heudreville-sur-eure": 30, "Houetteville": 30, "Igoville": 30, "La chapelle-du-bois-des-faulx": 30, "La haye-malherbe": 30, "Le manoir": 30, "Le mesnil-jourdain": 30, "Muids": 30, "Poses": 30, "Quatremare": 30, "Surtauville": 30, "Tournedos-sur-seine": 30, "Venables": 30, "Vraiville": 30,
    "Ailly": 30, "Ande": 30, "Canappeville": 30
};

function validerCommande(villeChoisie, totalPanier) {
    if (!zonesLivraison.hasOwnProperty(villeChoisie)) {
        afficherNotification(`❌ Désolé, nous ne livrons pas à ${villeChoisie} (limite 15km autour de Louviers).`);
        return false;
    }
    let minRequis = zonesLivraison[villeChoisie];
    if (totalPanier < minRequis) {
        afficherNotification(`⚠️ Pour ${villeChoisie}, min. ${minRequis}€ (Il manque ${(minRequis - totalPanier).toFixed(2)}€ !).`);
        return false;
    }
    return true;
}

// ==========================================
// 8. PIZZA BUILDER & UPSELLING
// ==========================================
function ouvrirPizzaBuilder() {
    const modal = document.getElementById('modal-builder');
    if (modal) modal.classList.remove('cache');
}
function fermerPizzaBuilder() {
    const modal = document.getElementById('modal-builder');
    if (modal) modal.classList.add('cache');
}

function ajouterPizzaCustom(e) {
    e.preventDefault();
    const base = document.getElementById('builder-base') ? document.getElementById('builder-base').value : 'Tomate';
    const checkboxes = document.querySelectorAll('input[name="ingredient"]:checked');
    let ingredientsListe = [];
    checkboxes.forEach(cb => ingredientsListe.push(cb.value));

    const nomCustom = `Pizza Custom (${base})`;
    const prixCustom = 11.90 + (ingredientsListe.length * 1.50);

    panier.push({ nom: nomCustom, prix: prixCustom, prixOriginal: prixCustom, options: ingredientsListe });
    mettreAJourPanier();
    fermerPizzaBuilder();
    afficherNotification("✓ Votre pizza sur-mesure a été ajoutée !");
}

function ajouterUpselling(nomProduit, prixProduit) {
    panier.push({ nom: nomProduit + " (Offre Flash)", prix: prixProduit, prixOriginal: prixProduit, options: [] });
    mettreAJourPanier();
    afficherNotification(`✓ ${nomProduit} ajouté à prix réduit !`);
    const box = document.getElementById('upselling-box');
    if (box) box.style.display = 'none';
}

// ==========================================
// 9. TRACKER DE COMMANDE EN TEMPS RÉEL
// ==========================================
let intervalSuivi = null;

function lancerTrackerDeCommande(idCommande) {
    const modal = document.getElementById('modal-tracker');
    if (!modal) return;
    
    modal.classList.remove('cache');
    
    intervalSuivi = setInterval(async () => {
        try {
            const res = await fetch(`${API_URL}/api/orders/${idCommande}`);
            if (res.ok) {
                const commandeAdmin = await res.json();
                mettreAJourVisuelTracker(commandeAdmin.status || commandeAdmin.etat); 
            }
        } catch (err) {
            console.error("Erreur de synchronisation du tracker :", err);
        }
    }, 5000); 
}

function mettreAJourVisuelTracker(statutAdmin) {
    if (!statutAdmin) return;
    const statut = statutAdmin.toLowerCase();

    if (statut.includes('préparation') || statut.includes('preparation') || statut.includes('cours')) {
        document.getElementById('step-2').style.color = "var(--success)";
        document.getElementById('step-2').innerHTML = "&#10004; En cours de préparation";
    }
    
    if (statut.includes('four')) {
        document.getElementById('step-2').style.color = "var(--success)";
        document.getElementById('step-2').innerHTML = "&#10004; En cours de préparation";
        document.getElementById('step-3').style.color = "var(--success)";
        document.getElementById('step-3').innerHTML = "&#10004; Au four";
    }
    
    if (statut.includes('prêt') || statut.includes('prete') || statut.includes('prête') || statut.includes('livré') || statut.includes('livree')) {
        document.getElementById('step-2').style.color = "var(--success)";
        document.getElementById('step-2').innerHTML = "&#10004; En cours de préparation";
        document.getElementById('step-3').style.color = "var(--success)";
        document.getElementById('step-3').innerHTML = "&#10004; Au four";
        document.getElementById('step-4').style.color = "var(--success)";
        document.getElementById('step-4').innerHTML = "&#10004; Prête !";
        
        if (intervalSuivi) clearInterval(intervalSuivi);
    }
}

function fermerTracker() {
    const modal = document.getElementById('modal-tracker');
    if (modal) modal.classList.add('cache');
    if (intervalSuivi) clearInterval(intervalSuivi); 
}

// ==========================================
// 10. ANIMATIONS & NOTIFICATIONS
// ==========================================
function afficherNotification(message) {
    const ancienneNotif = document.getElementById('notif-flash');
    if (ancienneNotif) ancienneNotif.remove();
    const notif = document.createElement('div');
    notif.id = 'notif-flash';
    notif.innerText = message;
    notif.style.position = 'fixed';
    notif.style.bottom = '20px';
    notif.style.left = '20px';
    notif.style.background = '#2a9d8f';
    notif.style.color = 'white';
    notif.style.padding = '12px 20px';
    notif.style.borderRadius = '6px';
    notif.style.fontWeight = 'bold';
    notif.style.zIndex = '3000';
    notif.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2500);
}

function changerModeCommande(mode) {
    modeCommandeActuel = mode;
    const btnLivraison = document.getElementById('btn-mode-livraison');
    const btnEmporter = document.getElementById('btn-mode-emporter');
    const champVille = document.getElementById('champ-ville-wrapper');
    const champHeure = document.getElementById('champ-heure-wrapper');

    if (mode === 'livraison') {
        if(btnLivraison) { btnLivraison.style.background = '#E63946'; btnLivraison.style.color = 'white'; btnLivraison.style.borderColor = '#E63946'; }
        if(btnEmporter) { btnEmporter.style.background = '#f1f1f1'; btnEmporter.style.color = '#333'; btnEmporter.style.borderColor = '#ccc'; }
        if(champVille) champVille.style.display = 'block';
        if(champHeure) champHeure.style.display = 'none';
    } else {
        if(btnEmporter) { btnEmporter.style.background = '#E63946'; btnEmporter.style.color = 'white'; btnEmporter.style.borderColor = '#E63946'; }
        if(btnLivraison) { btnLivraison.style.background = '#f1f1f1'; btnLivraison.style.color = '#333'; btnLivraison.style.borderColor = '#ccc'; }
        if(champVille) champVille.style.display = 'none';
        if(champHeure) champHeure.style.display = 'block';
    }
    mettreAJourPanier();
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const btn = document.getElementById('dark-btn');
    if (document.body.classList.contains('dark-mode')) {
        if (btn) btn.innerHTML = "☀️ Mode Jour";
        localStorage.setItem('pizzaTownTheme', 'dark');
        mettreAJourUICompte(); // Force update color of user button
    } else {
        if (btn) btn.innerHTML = "🌙 Mode Nuit";
        localStorage.setItem('pizzaTownTheme', 'light');
        mettreAJourUICompte(); // Force update color of user button
    }
}

// ==========================================
// 11. INITIALISATION AU DÉMARRAGE DU SITE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('pizzaTownTheme') === 'dark') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('dark-btn');
        if(btn) btn.innerHTML = "☀️ Mode Jour";
    }
    
    // Met à jour le bouton Mon Compte au lancement
    mettreAJourUICompte();

    const slides = document.querySelectorAll(".carousel-slide");
    const dots = document.querySelectorAll(".dot");
    if (slides.length > 0) {
        let currentIndex = 0;
        let slideInterval;
        function goToSlide(index) {
            slides.forEach(slide => slide.classList.remove("active"));
            dots.forEach(dot => dot.classList.remove("active"));
            currentIndex = index;
            slides[currentIndex].classList.add("active");
            if (dots[currentIndex]) dots[currentIndex].classList.add("active");
        }
        function nextSlide() {
            let nextIndex = (currentIndex + 1) % slides.length;
            goToSlide(nextIndex);
        }
        slideInterval = setInterval(nextSlide, 4000);
        dots.forEach((dot, index) => {
            dot.addEventListener("click", () => {
                clearInterval(slideInterval);
                goToSlide(index);
                slideInterval = setInterval(nextSlide, 4000);
            });
        });
    }

    const btnOuvrirPanier = document.getElementById('btn-ouvrir-panier');
    const btnFermerPanier = document.getElementById('btn-fermer-panier');
    const panneauPanier = document.getElementById('panneau-panier');
    const btnPayer = document.getElementById('btn-payer');
    const modalCheckout = document.getElementById('modal-checkout');
    const btnFermerModal = document.getElementById('btn-fermer-modal');
    const formCommande = document.getElementById('form-commande');

    if (btnOuvrirPanier && panneauPanier) btnOuvrirPanier.onclick = () => panneauPanier.classList.remove('cache');
    if (btnFermerPanier && panneauPanier) btnFermerPanier.onclick = () => panneauPanier.classList.add('cache');
    
    if (btnPayer && modalCheckout) {
        btnPayer.onclick = () => {
            if (!verifierSiOuvert()) {
                afficherNotification("💤 Pizza Town est actuellement fermé. Réouverture prochaine !");
                return;
            }
            if (panier.length === 0) { afficherNotification("⚠️ Votre panier est vide !"); return; }
            
            // AUTO-REMPLISSAGE DU CHECKOUT SI CLIENT CONNECTÉ
            if (currentUser) {
                if(document.getElementById('nom-client')) document.getElementById('nom-client').value = currentUser.nom || '';
                if(document.getElementById('tel-client')) document.getElementById('tel-client').value = currentUser.telephone || '';
                if(document.getElementById('ville-client') && currentUser.ville) document.getElementById('ville-client').value = currentUser.ville;
                if(document.getElementById('adresse-client') && currentUser.adresse) document.getElementById('adresse-client').value = currentUser.adresse;
            }
            
            modalCheckout.classList.remove('cache');
        };
    }
    if (btnFermerModal && modalCheckout) btnFermerModal.onclick = () => modalCheckout.classList.add('cache');

    if (formCommande) {
        formCommande.onsubmit = async (e) => {
            e.preventDefault();

            const nom = document.getElementById('nom-client').value;
            const telephone = document.getElementById('tel-client').value;
            const selectVille = document.getElementById('ville-client');
            const ville = selectVille ? selectVille.value : '';
            const adressePrecise = document.getElementById('adresse-client') ? document.getElementById('adresse-client').value.trim() : '';
            const heureRetrait = document.getElementById('heure-retrait') ? document.getElementById('heure-retrait').value : '';
            
            let totalCalculé = panier.reduce((acc, item) => acc + item.prix, 0);
            if (codePromoApplique) {
                totalCalculé -= codePromoApplique.valeur;
                if (totalCalculé < 0) totalCalculé = 0;
            }

            if (modeCommandeActuel === 'livraison') {
                if (!ville || !adressePrecise) { afficherNotification("⚠️ Veuillez renseigner la ville et l'adresse précise."); return; }
                if (!validerCommande(ville, totalCalculé)) return; 
            } else {
                if (!heureRetrait) { afficherNotification("⚠️ Veuillez indiquer une heure de retrait."); return; }
            }

            const adresseComplete = modeCommandeActuel === 'livraison' 
                ? `${adressePrecise}, ${ville}` 
                : 'À emporter (Sur place)';

            const nouvelleCommande = {
                items: panier,
                total: totalCalculé,
                mode: modeCommandeActuel,
                customerName: nom,
                phone: telephone,
                address: adresseComplete,
                heureRetrait: modeCommandeActuel === 'emporter' ? heureRetrait : 'Immédiat'
            };
            
            // LIAISON AVEC LE COMPTE CLIENT
            if (currentUser && currentUser._id) {
                nouvelleCommande.userId = currentUser._id;
            }

            try {
                const response = await fetch(`${API_URL}/api/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nouvelleCommande)
                });

                if (response.ok) {
                    const commandeEnregistree = await response.json();
                    localStorage.setItem('derniereCommande', JSON.stringify(commandeEnregistree));
                    
                    panier = [];
                    codePromoApplique = null;
                    mettreAJourPanier();
                    if (modalCheckout) modalCheckout.classList.add('cache');
                    if (panneauPanier) panneauPanier.classList.add('cache');
                    formCommande.reset();

                    lancerTrackerDeCommande(commandeEnregistree._id);
                    
                } else {
                    afficherNotification("❌ Erreur lors de la validation.");
                }
            } catch (err) {
                console.error("Erreur réseau :", err);
                afficherNotification("❌ Impossible de contacter le serveur de la pizzeria.");
            }
        };
    }
});

chargerMenuDepuisAPI('tous');