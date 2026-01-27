
const supabaseUrl = 'https://tfecoyaxojvmaawyyvwp.supabase.co';
const supabaseAnonKey = 'sb_publishable_6cUaUd7CDAUEpGASUm71wQ_GzCBpas5';

const categories = [
    'Estética & Beleza', 'Construção Civil', 'Tecnologia & TI', 'Gastronomia',
    'Saúde & Bem-estar', 'Jurídico', 'Educação', 'Pet Shop', 'Marketing', 'Manutenção'
];

const specialties = {
    'Estética & Beleza': ['Corte Masculino', 'Manicure', 'Skin Care', 'Maquiagem Profissional'],
    'Construção Civil': ['Eletricista', 'Encanador', 'Pintura Residencial', 'Mestre de Obras'],
    'Tecnologia & TI': ['Desenvolvimento Web', 'Suporte Técnico', 'Segurança Digital', 'Cibersegurança'],
    'Gastronomia': ['Confeitaria Gourmet', 'Chef de Cozinha', 'Produção de Eventos', 'Barista'],
    'Saúde & Bem-estar': ['Personal Trainer', 'Nutrição Clínica', 'Fisioterapia', 'Massoterapia'],
    'Jurídico': ['Advogado Civil', 'Consultoria Tributária', 'Direito do Trabalho'],
    'Educação': ['Aulas de Inglês', 'Reforço Escolar', 'Treinamento Corporativo'],
    'Pet Shop': ['Banho e Tosa', 'Adestramento', 'Veterinária'],
    'Marketing': ['Gestão de Tráfego', 'Social Media', 'Design Gráfico'],
    'Manutenção': ['Mecânica Automotiva', 'Reparo de Celulares', 'Limpeza de Ar Condicionado']
};

const businessNames = [
    "Studio Glamour", "Mestre das Reformas", "Coders Hub", "Delícias do Chef", "Vita Fit Center",
    "Justiça Direta", "Inglês para Todos", "Patinhas Felizes", "Impacto Digital", "Fix It Solutions",
    "Bela Face", "Constru Bem", "Tech Masters", "Sabor & Arte", "Equilíbrio Total",
    "Consultoria Alpha", "Educa Saberes", "Pet Care Plus", "Mídia Ninja", "Dr. Conserto",
    "Ousadia Barber", "Sólida Engenharia", "Dev Squad", "Aroma Gourmet", "Life Coach Pro",
    "Legal Prime", "Bright Minds", "Love My Pet", "Visionary Ads", "Master Reparos"
];

async function seed() {
    console.log("Iniciando semeadura de 30 contas...");

    for (let i = 0; i < 30; i++) {
        const cat = categories[i % categories.length];
        const spec = specialties[cat][Math.floor(Math.random() * specialties[cat].length)];
        const name = businessNames[i];
        const randomId = crypto.randomUUID(); // Usando UUID para owner_id fictício

        const business = {
            name: name,
            category: cat,
            specialty: spec,
            description: `Profissional especializado em ${spec}. Atendimento de alta qualidade e confiança.`,
            logo: `https://picsum.photos/seed/${name.replace(/\s/g, '')}/200`,
            whatsapp: "(11) 9" + Math.floor(Math.random() * 90000000 + 10000000),
            phone: "(11) 4002-8922",
            email: `${name.toLowerCase().replace(/\s/g, '.')}@exemplo.com`,
            address: "Bairro Central, Cidade Modelo",
            hours: "Seg-Sex: 08:00 - 18:00",
            owner_id: randomId
        };

        try {
            // Inserir Business
            const res = await fetch(`${supabaseUrl}/rest/v1/businesses`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(business)
            });

            if (!res.ok) {
                const err = await res.json();
                console.error(`Erro ao criar ${name}:`, err);
                continue;
            }

            const createdBiz = (await res.json())[0];
            console.log(`[+] Criado: ${name}`);

            // Inserir 2 a 3 Posts para cada empresa
            const numPosts = Math.floor(Math.random() * 2) + 2;
            for (let j = 0; j < numPosts; j++) {
                const post = {
                    business_id: createdBiz.id,
                    media_url: `https://picsum.photos/seed/${createdBiz.id}${j}/800/1000`,
                    thumbnail_url: `https://picsum.photos/seed/${createdBiz.id}${j}/400/500`,
                    type: 'image',
                    caption: `Confira um pouco do nosso trabalho com ${spec}! #profissional #serviço`,
                    likes: Math.floor(Math.random() * 150)
                };

                const resPost = await fetch(`${supabaseUrl}/rest/v1/posts`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseAnonKey,
                        'Authorization': `Bearer ${supabaseAnonKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(post)
                });

                if (resPost.ok) console.log(`   - Post ${j + 1} criado.`);
            }

        } catch (e) {
            console.error("Falha na execução:", e);
        }
    }

    console.log("Semeadura concluída!");
}

seed();
