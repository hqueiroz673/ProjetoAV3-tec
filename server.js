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
        const email = req.body.email;
        const senha = req.body.senha;
        const userExists = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Email ja cadastrado' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        
        const newUser = await pool.query(
            'INSERT INTO usuarios (email, senha) VALUES ($1, $2) RETURNING id, email',
            [email, senhaHash]
        );
        
        res.status(201).json({ message: 'Sucesso', usuario: newUser.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const email = req.body.email;
        const senha = req.body.senha;
        const respDB = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (respDB.rows.length === 0) {
            return res.status(401).json({ auth: false });
        }
        
        const usuario = respDB.rows[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        
        if (!senhaValida) {
            return res.status(401).json({ auth: false });
        }
        
        const token = jwt.sign({ userId: usuario.id, email: usuario.email }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ auth: true, token });
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ auth: false });

    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).json({ auth: false });
        req.userId = decoded.userId;
        next();
    });
};

app.post('/resumo-ia', verificarToken, async (req, res) => {
    try {
        const titulo = req.body.titulo;
        const texto = req.body.texto;
        const prompt = 'Resuma o livro ' + titulo + ' com base neste texto: ' + texto;
        
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
        });
        
        res.json({ resumo: response.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Servidor rodando na porta ' + PORT);
});
