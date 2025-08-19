document.addEventListener('DOMContentLoaded', () => {
            
            // --- TRANSLATION SCRIPT ---
            const translations = {
                es: {
                    nav_dashboard: "Dashboard",
                    nav_invoices: "Facturas IA",
                    nav_projects: "Proyectos",
                    search_placeholder: "Buscar proyectos, facturas...",
                    hero_title: "Innovación y <span class='text-glow' style='color: var(--accent);'>Estrategia</span> Digital",
                    hero_subtitle: "Transformamos ideas en soluciones digitales de alto impacto. Combinamos diseño, tecnología y estrategia para llevar tu negocio al siguiente nivel.",
                    hero_button: "Descubre Cómo",
                    services_title: "Nuestros Servicios",
                    services_subtitle: "Soluciones a la medida para un mundo digital.",
                    service1_title: "Desarrollo Web Moderno",
                    service1_desc: "Creamos sitios y aplicaciones web rápidas, seguras y responsivas.",
                    service2_title: "Consultoría en IA",
                    service2_desc: "Integramos IA en tus procesos para optimizar operaciones y experiencias.",
                    service3_title: "Diseño UX/UI",
                    service3_desc: "Diseñamos interfaces intuitivas que garantizan una experiencia memorable.",
                    clients_title: "Confían en Nosotros",
                    footer_text: "&copy; 2024 Brain Stormers. Todos los derechos reservados."
                },
                en: {
                    nav_dashboard: "Dashboard",
                    nav_invoices: "AI Invoices",
                    nav_projects: "Projects",
                    search_placeholder: "Search projects, invoices...",
                    hero_title: "Innovation and <span class='text-glow' style='color: var(--accent);'>Digital</span> Strategy",
                    hero_subtitle: "We transform ideas into high-impact digital solutions. We combine design, technology, and strategy to take your business to the next level.",
                    hero_button: "Discover How",
                    services_title: "Our Services",
                    services_subtitle: "Tailor-made solutions for a digital world.",
                    service1_title: "Modern Web Development",
                    service1_desc: "We create fast, secure, and responsive websites and web applications.",
                    service2_title: "AI Consulting",
                    service2_desc: "We integrate AI into your processes to optimize operations and experiences.",
                    service3_title: "UX/UI Design",
                    service3_desc: "We design intuitive interfaces that guarantee a memorable user experience.",
                    clients_title: "Trusted By",
                    footer_text: "&copy; 2024 Brain Stormers. All rights reserved."
                },
                fr: {
                    nav_dashboard: "Tableau de Bord",
                    nav_invoices: "Factures IA",
                    nav_projects: "Projets",
                    search_placeholder: "Rechercher projets, factures...",
                    hero_title: "Innovation et <span class='text-glow' style='color: var(--accent);'>Stratégie</span> Numérique",
                    hero_subtitle: "Nous transformons les idées en solutions numériques à fort impact. Nous combinons design, technologie et stratégie pour faire passer votre entreprise au niveau supérieur.",
                    hero_button: "Découvrez Comment",
                    services_title: "Nos Services",
                    services_subtitle: "Des solutions sur mesure pour un monde numérique.",
                    service1_title: "Développement Web Moderne",
                    service1_desc: "Nous créons des sites et applications web rapides, sécurisés et réactifs.",
                    service2_title: "Conseil en IA",
                    service2_desc: "Nous intégrons l'IA dans vos processus pour optimiser les opérations et les expériences.",
                    service3_title: "Design UX/UI",
                    service3_desc: "Nous concevons des interfaces intuitives qui garantissent une expérience utilisateur mémorable.",
                    clients_title: "Ils Nous Font Confiance",
                    footer_text: "&copy; 2024 Brain Stormers. Tous droits réservés."
                },
                de: {
                    nav_dashboard: "Dashboard",
                    nav_invoices: "KI-Rechnungen",
                    nav_projects: "Projekte",
                    search_placeholder: "Projekte, Rechnungen suchen...",
                    hero_title: "Innovation und <span class='text-glow' style='color: var(--accent);'>Digitale</span> Strategie",
                    hero_subtitle: "Wir verwandeln Ideen in wirkungsvolle digitale Lösungen. Wir kombinieren Design, Technologie und Strategie, um Ihr Unternehmen auf die nächste Stufe zu heben.",
                    hero_button: "Entdecken Sie Wie",
                    services_title: "Unsere Dienstleistungen",
                    services_subtitle: "Maßgeschneiderte Lösungen für eine digitale Welt.",
                    service1_title: "Moderne Webentwicklung",
                    service1_desc: "Wir erstellen schnelle, sichere und reaktionsschnelle Websites und Webanwendungen.",
                    service2_title: "KI-Beratung",
                    service2_desc: "Wir integrieren KI in Ihre Prozesse, um Abläufe und Erlebnisse zu optimieren.",
                    service3_title: "UX/UI-Design",
                    service3_desc: "Wir gestalten intuitive Benutzeroberflächen, die ein unvergessliches Benutzererlebnis garantieren.",
                    clients_title: "Vertraut Von",
                    footer_text: "&copy; 2024 Brain Stormers. Alle Rechte vorbehalten."
                }
            };

            const setLanguage = (lang) => {
                const langData = translations[lang];
                document.querySelectorAll('[data-translate-key]').forEach(el => {
                    const key = el.dataset.translateKey;
                    if (langData[key]) {
                        if (el.tagName === 'INPUT') {
                            el.placeholder = langData[key];
                        } else {
                            el.innerHTML = langData[key];
                        }
                    }
                });
                document.documentElement.lang = lang;
                localStorage.setItem('language', lang);
                currentLangSpan.textContent = lang.toUpperCase();
            };

            // --- THEME TOGGLE SCRIPT ---
            const themeToggle = document.getElementById('theme-toggle');
            const body = document.body;
            const themeIcon = themeToggle.querySelector('i');

            const applyTheme = (theme) => {
                if (theme === 'light') {
                    body.classList.add('light-theme');
                    themeIcon.classList.remove('fa-sun');
                    themeIcon.classList.add('fa-moon');
                } else {
                    body.classList.remove('light-theme');
                    themeIcon.classList.remove('fa-moon');
                    themeIcon.classList.add('fa-sun');
                }
            };

            const savedTheme = localStorage.getItem('theme') || 'dark';
            applyTheme(savedTheme);

            themeToggle.addEventListener('click', () => {
                const newTheme = body.classList.contains('light-theme') ? 'dark' : 'light';
                applyTheme(newTheme);
                localStorage.setItem('theme', newTheme);
            });


            // --- LANGUAGE DROPDOWN SCRIPT ---
            const langToggle = document.getElementById('lang-toggle');
            const langMenu = document.getElementById('lang-menu');
            const currentLangSpan = document.getElementById('current-lang');
            const langOptions = document.querySelectorAll('.lang-option');

            langToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                langMenu.classList.toggle('hidden');
            });

            langOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.preventDefault();
                    const selectedLang = e.currentTarget.dataset.lang;
                    setLanguage(selectedLang);
                    langMenu.classList.add('hidden');
                });
            });
            
            window.addEventListener('click', () => {
                if (!langMenu.classList.contains('hidden')) {
                    langMenu.classList.add('hidden');
                }
            });

            const savedLanguage = localStorage.getItem('language') || 'es';
            setLanguage(savedLanguage);

            // --- ACTIVE NAVIGATION LINK SCRIPT ---
            const navLinks = document.querySelectorAll('#main-nav .nav-button');
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    navLinks.forEach(l => l.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                });
            });

            // --- LOGOUT FUNCTION ---
            window.handleLogout = function() {
                // Limpiar localStorage si hay datos de sesión
                localStorage.removeItem('user_info');
                localStorage.removeItem('restaurante_actual');
                
                // Mostrar mensaje de confirmación
                if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                    // Redirigir a la página de login
                    window.location.href = '../login/index.html';
                }
            };
        });


