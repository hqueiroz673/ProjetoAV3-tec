const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { OpenAI } = require('openai');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const JWT_SECRET = process.env.JWT_SECRET || 'chave_super_secreta_unifor';

app.post('/registro', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const userExists = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        
        const newUser = await pool.query(
            'INSERT INTO usuarios (email, senha) VALUES ($1, $2) RETURNING id, email',
            [email, senhaHash]
        );
        
        res.status(201).json({ message: 'Usuário criado com sucesso!', usuario: newUser.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (rows.length === 0) {
            return res.status(401).json({ auth: false, message: 'Usuário não encontrado' });
        }
        
        const usuario = rows[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        
        if (!senhaValida) {
            return res.status(401).json({ auth: false, message: 'Senha incorreta' });
        }
        
        const token = jwt.sign({ userId: usuario.id, email: usuario.email }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ auth: true, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro no servidor durante o login' });
    }
});

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ auth: false, message: 'Nenhum token fornecido.' });

    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).json({ auth: false, message: 'Falha ao autenticar token.' });
        req.userId = decoded.userId;
        next();
    });
};

app.get('/livros', verificarToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM livros');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar livros' });
    }
});

app.get('/livros/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM livros WHERE id = $1', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar o livro' });
    }
});

app.post('/livros/:id/resumo', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT titulo, conteudo FROM livros WHERE id = $1', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }
        
        const livro = rows[0];
        const prompt = `Resuma a seguinte obra literária chamada ${livro.titulo}. Destaque os pontos principais da narrativa baseando-se neste texto original:\n\n${livro.conteudo}`;
        
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
        });
        
        res.json({ 
            titulo: livro.titulo,
            resumo: response.choices[0].message.content
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

app.post('/resumo-ia', verificarToken, async (req, res) => {
    try {
        const { titulo, texto } = req.body;
        const prompt = `Resuma o livro ${titulo} com base nesta sinopse: ${texto}`;
        
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
        });
        
        res.json({ resumo: response.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

// NOVA ROTA: O Railway busca os livros no Google para evitar bloqueio do seu celular
app.get('/api/pesquisar', async (req, res) => {
    try {
        const { tema } = req.query;
        const urlBusca = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(tema)}&maxResults=20`;
        const respostaGoogle = await fetch(urlBusca);
        const dados = await respostaGoogle.json();
        res.json(dados);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Falha ao buscar no Google Books' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
