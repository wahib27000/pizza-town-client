let modeCommandeActuel = 'livraison';
const API_URL = "https://pizza-town-backend-1.onrender.com";

let panier = [];
const panierSauvegarde = localStorage.getItem('panierPizzaTown');
if (panierSauvegarde) {
    panier = JSON.parse(panierSauvegarde);
}

let produits = [];

// --- CHARGEMENT DU CATALOGUE DEPUIS MONGODB ---
async function chargerMenuDepuisAPI(categorieFiltre = 'tous') {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        produits = await response.json();
        afficherMenu(categorieFiltre);
    } catch (err) {
        console.error("Erreur de chargement du catalogue :", err);
    }
}

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
                    <label style="flex: 1; text-align: center; font-size: 0.75rem; font-weight: bold; padding: 6px 2px; background: #f1f1f1; border-radius: 6px; cursor: pointer;">
                        <input type="radio" name="taille-${produit._id}" value="junior" style="display:none;" onchange="changerPrixPizza('${produit._id}', ${(produit.prixBase - 3.90).toFixed(2)}, this)">
                        Junior<br><span style="font-weight: normal; color: #666;">${(produit.prixBase - 3.90).toFixed(2)}€</span>
                    </label>
                    <label style="flex: 1; text-align: center; font-size: 0.75rem; font-weight: bold; padding: 6px 2px; background: #E63946; color: white; border-radius: 6px; cursor: pointer;" class="taille-active">
                        <input type="radio" name="taille-${produit._id}" value="senior" checked style="display:none;" onchange="changerPrixPizza('${produit._id}', ${produit.prixBase}, this)">
                        Senior<br><span style="font-weight: normal; color: #ffe5e7;">${produit.prixBase}€</span>
                    </label>
                    <label style="flex: 1; text-align: center; font-size: 0.75rem; font-weight: bold; padding: 6px 2px; background: #f1f1f1; border-radius: 6px; cursor: pointer;">
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
        label.style.background = '#f1f1f1';
        label.style.color = '#333';
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

    panier.push({
        nom: nomFinal,
        prix: prixFinal,
        prixOriginal: prixFinal 
    });

    mettreAJourPanier();
    afficherNotification(`✓ ${nomFinal} ajouté au panier !`);
}

function mettreAJourPanier() {
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
    
    panier.forEach((article, index) => {
        total += article.prix;
        const ligne = document.createElement('div');
        ligne.classList.add('panier-item');
        
        ligne.innerHTML = `
            <div class="panier-item-infos">
                <span class="panier-item-nom">${article.nom}</span>
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
}

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

// --- INITIALISATION DES ÉVÉNEMENTS GLOBAUX ---
document.addEventListener('DOMContentLoaded', () => {
    const btnOuvrirPanier = document.getElementById('btn-ouvrir-panier');
    const btnFermerPanier = document.getElementById('btn-fermer-panier');
    const panneauPanier = document.getElementById('panneau-panier');
    const btnPayer = document.getElementById('btn-payer');
    const modalCheckout = document.getElementById('modal-checkout');
    const btnFermerModal = document.getElementById('btn-fermer-modal');
    const formCommande = document.getElementById('form-commande');

    if (btnOuvrirPanier && panneauPanier) {
        btnOuvrirPanier.onclick = () => panneauPanier.classList.remove('cache');
    }

    if (btnFermerPanier && panneauPanier) {
        btnFermerPanier.onclick = () => panneauPanier.classList.add('cache');
    }

    if (btnPayer && modalCheckout) {
        btnPayer.onclick = () => {
            if (panier.length === 0) {
                alert("Votre panier est vide !");
                return;
            }
            modalCheckout.classList.remove('cache');
        };
    }

    if (btnFermerModal && modalCheckout) {
        btnFermerModal.onclick = () => modalCheckout.classList.add('cache');
    }

    // SOUMISSION DE LA COMMANDE VERS MONGODB / RENDER
    if (formCommande) {
        formCommande.onsubmit = async (e) => {
            e.preventDefault();

            const nom = document.getElementById('nom-client').value;
            const telephone = document.getElementById('tel-client').value;
            const ville = document.getElementById('ville-client') ? document.getElementById('ville-client').value : '';
            const heureRetrait = document.getElementById('heure-retrait') ? document.getElementById('heure-retrait').value : '';

            const totalCalculé = panier.reduce((acc, item) => acc + item.prix, 0);

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
                    
                    window.location.href = 'confirmation.html';
                } else {
                    alert("Erreur lors de la validation de la commande.");
                }
            } catch (err) {
                console.error("Erreur réseau :", err);
                alert("Impossible de contacter le serveur de la pizzeria.");
            }
        };
    }
});

// Lancement du chargement initial du menu
chargerMenuDepuisAPI('tous');