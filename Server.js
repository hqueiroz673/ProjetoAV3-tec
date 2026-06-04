const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { GoogleGenAI } = require('@google/genai');
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

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });
        
        res.json({ 
            titulo: livro.titulo,
            resumo: response.text 
        });
    } catch (error) {
        console.error("ERRO GRAVE NA ROTA DE RESUMO:");
        console.error(error);
        res.status(500).json({ 
            error: 'Erro interno no servidor',
            detalhe: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
