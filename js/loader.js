document.addEventListener('DOMContentLoaded', async () => {
    async function fetchJSON(url, fallback = null) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.warn(`Failed to load ${url}:`, err);
            return fallback;
        }
    }

    // ---- Helper: calculate age from DD/MM/YYYY ----
    function calculateAge(birthdayStr) {
        if (!birthdayStr) return null;
        const parts = birthdayStr.split('/');
        if (parts.length !== 3) return null;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

        const birthDate = new Date(year, month, day);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    // ---- 1. Load Profile ----
    const profile = await fetchJSON('/data/profile.json', {});
    const bioName = document.getElementById('bio-name');
    if (bioName && profile.name) bioName.textContent = profile.name;

    const bioTagline = document.getElementById('bio-tagline');
    if (bioTagline && profile.tagline) bioTagline.textContent = profile.tagline;

    let ageText = '';
    if (profile.birthday) {
        const age = calculateAge(profile.birthday);
        if (age !== null) ageText = `${age}`;
    }
    const bioAge = document.getElementById('bio-age');
    if (bioAge && ageText) bioAge.textContent = ageText;

    const bioPronouns = document.getElementById('bio-pronouns');
    if (bioPronouns && profile.pronouns) bioPronouns.textContent = profile.pronouns;

    const bioSexuality = document.getElementById('bio-sexuality');
    if (bioSexuality && profile.sexuality) bioSexuality.textContent = profile.sexuality;

    // ---- 2. Load Social Links ----
    const socials = await fetchJSON('/data/socials.json', []);
    const socialList = document.getElementById('social-links');
    if (socialList && socials.length) {
        socialList.innerHTML = '';
        socials.forEach(social => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = social.url;
            a.target = '_blank';
            if (social.icon) {
                const i = document.createElement('i');
                i.className = social.icon;
                a.prepend(i);
                a.appendChild(document.createTextNode(' ' + social.name));
            } else {
                a.textContent = social.name;
            }
            li.appendChild(a);
            socialList.appendChild(li);
        });
    }

    // ---- 3. Load Navigation ----
    const navItems = await fetchJSON('/data/nav.json', []);
    const navUl = document.querySelector('nav ul');
    if (navUl && navItems.length) {
        navUl.innerHTML = '';
        const currentPath = window.location.pathname;
        navItems.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = item.url;
            a.textContent = item.name;
            const linkPath = new URL(item.url, window.location.origin).pathname;
            if (currentPath === linkPath) a.classList.add('active');
            if (item.icon) {
                const i = document.createElement('i');
                i.className = item.icon + ' me-1';
                a.prepend(i);
            }
            li.appendChild(a);
            navUl.appendChild(li);
        });
    }

    // ---- 4. Load Footer ----
    const footerData = await fetchJSON('/data/footer.json', {});
    const footer = document.querySelector('footer');
    if (footer) {
        let html = '';
        if (footerData.copyright) html += footerData.copyright;
        if (footerData.templateCredit && footerData.templateUrl) {
            if (html) html += ' | ';
            html += `${footerData.templateCredit} <a href="${footerData.templateUrl}">${footerData.templateName || 'template'}</a>`;
        }
        if (html) footer.innerHTML = html;
    }

    // ---- 5. Load Featured Content (only on home page) ----
    const isHome = ['/', '/index.html', '/', '/index.html'].includes(window.location.pathname);
    if (isHome) {
        const featured = await fetchJSON('/data/featured.json', []);
        const container = document.getElementById('featured-content');
        if (container && featured.length) {
            container.innerHTML = '';
            featured.forEach(item => {
                const div = document.createElement('div');
                div.className = 'featured-item';
                div.style.marginBottom = '1rem';
                div.style.padding = '0.5rem';
                div.style.borderLeft = '3px solid var(--accent-color)';
                let iconHtml = item.icon ? `<i class="${item.icon}"></i> ` : '';
                div.innerHTML = `
          <h3 style="margin:0;"><a href="${item.link}">${iconHtml}${item.title}</a></h3>
          <p style="margin:0.2rem 0 0 0; color: var(--text-color2);">${item.description}</p>
        `;
                container.appendChild(div);
            });
        }
    }
});
