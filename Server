const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const JWT_SECRET = process.env.JWT_SECRET || 'chave_super_secreta_unifor';

app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    
    if (email === 'hiago@unifor.br' && senha === '123456') {
        const token = jwt.sign({ userId: 1, email }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ auth: true, token });
    }
    
    res.status(401).json({ auth: false, message: 'Login invalido' });
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

app.post('/resumo', verificarToken, async (req, res) => {
    try {
        const { texto } = req.body;
        const prompt = `Resuma este trecho e destaque 3 pontos principais:\n\n${texto}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
        });
        
        res.json({ resumo: response.text });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar resumo' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
