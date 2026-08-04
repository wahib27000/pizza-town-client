// ==========================================
// 1. CONFIGURATION & VARIABLES GLOBALES
// ==========================================
const API_URL = "https://pizza-town-backend-1.onrender.com";
let modeCommandeActuel = 'livraison';
let panier = [];
let produits = [];

// Chargement du panier sauvegardé
const panierSauvegarde = localStorage.getItem('panierPizzaTown');
if (panierSauvegarde) {
    panier = JSON.parse(panierSauvegarde);
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
    
    const produitsFiltres = categorieFiltre === 'tous' 
        ? produits 
        : produits.filter(p => p.categorie === categorieFiltre);

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

    panier.push({ nom: nomFinal, prix: prixFinal, prixOriginal: prixFinal });
    mettreAJourPanier();
    afficherNotification(`✓ ${nomFinal} ajouté au panier !`);
}

function appliquerPromosAutomatiques(itemsPanier) {
    const now = new Date();
    const dayOfWeek = now.getDay(); 
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    const timeInMinutes = currentHour * 60 + currentMinutes;
    const isEvening = timeInMinutes >= 1080 && timeInMinutes <= 1380; // 18h - 23h
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
        localStorage.removeItem('panierPizzaTown');
        return;
    }
    
    panierTraite.forEach((article, index) => {
        total += article.prix;
        panier[index].prix = article.prix; 
        const ligne = document.createElement('div');
        ligne.classList.add('panier-item');
        
        let badgePromoHTML = article.promoappliquee ? `<br><span style="font-size: 0.7rem; background: #2a9d8f; color: white; padding: 2px 6px; border-radius: 4px;">${article.promoappliquee}</span>` : '';

        ligne.innerHTML = `
            <div class="panier-item-infos">
                <span class="panier-item-nom">${article.nom} ${badgePromoHTML}</span>
                <span class="panier-item-prix">${article.prix.toFixed(2)} €</span>
            </div>
            <button class="panier-btn-supprimer" onclick="retirerDuPanier(${index})" title="Supprimer">✕</button>
        `;
        listeArticles.appendChild(ligne);
    });
    
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
// 6. RÈGLES DE LIVRAISON
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
// 7. PIZZA BUILDER & UPSELLING
// ==========================================
function ouvrirPizzaBuilder() {
    const modal = document.getElementById('modal-builder');
    if (modal) modal.classList.remove('cache');
}
function fermerPizzaBuilder() {
    const modal = document.getElementById('modal-builder');
    if (modal) modal.classList.add('cache');
}
function ajouterPizzaCustomAuPanier(e) {
    e.preventDefault();
    const base = document.getElementById('builder-base') ? document.getElementById('builder-base').value : 'Tomate';
    const checkboxes = document.querySelectorAll('input[name="ingredient"]:checked');
    let ingredientsListe = [];
    checkboxes.forEach(cb => ingredientsListe.push(cb.value));

    const nomCustom = `Pizza Custom (${base} + ${ingredientsListe.length ? ingredientsListe.join(', ') : 'Rien'})`;
    const prixCustom = 11.90 + (ingredientsListe.length * 1.50);

    panier.push({ nom: nomCustom, prix: prixCustom, prixOriginal: prixCustom });
    mettreAJourPanier();
    fermerPizzaBuilder();
    afficherNotification("✓ Votre pizza sur-mesure a été ajoutée !");
}
function ajouterUpselling(nomProduit, prixProduit) {
    panier.push({ nom: nomProduit + " (Offre Flash)", prix: prixProduit, prixOriginal: prixProduit });
    mettreAJourPanier();
    afficherNotification(`✓ ${nomProduit} ajouté à prix réduit !`);
    const box = document.getElementById('upselling-box');
    if (box) box.style.display = 'none';
}

// ==========================================
// 8. TRACKER DE COMMANDE EN TEMPS RÉEL (ADMIN)
// ==========================================
let intervalSuivi = null;

function lancerTrackerDeCommande(idCommande) {
    const modal = document.getElementById('modal-tracker');
    if (!modal) return;
    
    // 1. On affiche la modale
    modal.classList.remove('cache');
    
    // 2. On lance une requête vers le backend toutes les 5 secondes
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

    if (statut.includes('préparation') || statut.includes('preparation')) {
        document.getElementById('step-2').style.color = "var(--success)";
        document.getElementById('step-2').innerHTML = "&#10004; En cours de préparation";
    }
    
    if (statut.includes('four')) {
        document.getElementById('step-2').style.color = "var(--success)";
        document.getElementById('step-2').innerHTML = "&#10004; En cours de préparation";
        document.getElementById('step-3').style.color = "var(--success)";
        document.getElementById('step-3').innerHTML = "&#10004; Au four";
    }
    
    if (statut.includes('prêt') || statut.includes('prete') || statut.includes('prête') || statut.includes('terminé') || statut.includes('livré')) {
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
// 9. ANIMATIONS (VOL PANIER, NOTIFICATIONS, MODE SOMBRE)
// ==========================================
document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('add-btn')) {
        const card = e.target.closest('.product-card, .pizza-card');
        const cartIcon = document.querySelector('.cart-btn, .cart-icon, #btn-ouvrir-panier');

        if (!card || !cartIcon || card.classList.contains('flying')) return;

        const cardRect = card.getBoundingClientRect();
        const cartRect = cartIcon.getBoundingClientRect();

        const deltaX = (cartRect.left + cartRect.width / 2) - (cardRect.left + cardRect.width / 2);
        const deltaY = (cartRect.top + cartRect.height / 2) - (cardRect.top + cardRect.height / 2);

        card.style.setProperty('--translate-x', `${deltaX}px`);
        card.style.setProperty('--translate-y', `${deltaY}px`);
        card.classList.add('flying');

        setTimeout(() => {
            card.classList.remove('flying');
            card.style.removeProperty('--translate-x');
            card.style.removeProperty('--translate-y');
        }, 600);
    }
});

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
    } else {
        if (btn) btn.innerHTML = "🌙 Mode Nuit";
        localStorage.setItem('pizzaTownTheme', 'light');
    }
}

// ==========================================
// 10. INITIALISATION AU DÉMARRAGE DU SITE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Mode sombre
    if (localStorage.getItem('pizzaTownTheme') === 'dark') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('dark-btn');
        if(btn) btn.innerHTML = "☀️ Mode Jour";
    }

    // Carrousel Promotions
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

    // Gestion de la modale Panier & Checkout
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
            if (panier.length === 0) { afficherNotification("⚠️ Votre panier est vide !"); return; }
            modalCheckout.classList.remove('cache');
        };
    }
    if (btnFermerModal && modalCheckout) btnFermerModal.onclick = () => modalCheckout.classList.add('cache');

    // SOUMISSION DE LA COMMANDE ET LANCEMENT DU TRACKER VRAI
    if (formCommande) {
        formCommande.onsubmit = async (e) => {
            e.preventDefault();

            const nom = document.getElementById('nom-client').value;
            const telephone = document.getElementById('tel-client').value;
            const selectVille = document.getElementById('ville-client');
            const ville = selectVille ? selectVille.value : '';
            const heureRetrait = document.getElementById('heure-retrait') ? document.getElementById('heure-retrait').value : '';
            
            const totalCalculé = panier.reduce((acc, item) => acc + item.prix, 0);

            // Vérifications règles
            if (modeCommandeActuel === 'livraison') {
                if (!ville) { afficherNotification("⚠️ Veuillez choisir une ville."); return; }
                if (!validerCommande(ville, totalCalculé)) return; 
            } else {
                if (!heureRetrait) { afficherNotification("⚠️ Veuillez indiquer une heure de retrait."); return; }
            }

            const nouvelleCommande = {
                items: panier,
                total: totalCalculé,
                mode: modeCommandeActuel,
                customerName: nom,
                phone: telephone,
                address: modeCommandeActuel === 'livraison' ? ville : 'À emporter (Sur place)',
                heureRetrait: modeCommandeActuel === 'emporter' ? heureRetrait : 'Immédiat'
            };

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
                    mettreAJourPanier();
                    if (modalCheckout) modalCheckout.classList.add('cache');
                    if (panneauPanier) panneauPanier.classList.add('cache');
                    formCommande.reset();

                    // MAGIE : ON LANCE LE TRACKER QUI VA INTERROGER LA BDD
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

// Lancement au démarrage
chargerMenuDepuisAPI('tous');