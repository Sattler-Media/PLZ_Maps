import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getPostaktuellPreis } from './postaktuell.js';
import { getPostwurfspezialPreis } from './postwurfSp.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ruta para Postaktuell
app.post('/preis/postaktuell', async (req, res) => {
  try {
    const {
      numberItemsTariffZoneA,
      numberItemsTariffZoneB,
      itemWeightInGram,
      paProductVariant,
      deliveryDistrictSelection,
      inductionDate
    } = req.body;

    const result = await getPostaktuellPreis(
      numberItemsTariffZoneA,
      numberItemsTariffZoneB,
      itemWeightInGram,
      paProductVariant,
      deliveryDistrictSelection,
      inductionDate
    );

    res.json(result);
  } catch (error) {
    console.error('Error en /preis/postaktuell:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para Postwurf Spezial
app.post('/preis/postwurfsp', async (req, res) => {
  try {
    const {
      quantity,
      lengthInDeciMm,
      widthInDeciMm,
      heightInDeciMm,
      weightInGram,
      inductionDate,
      mailingItemTypePostcard,
      notEnabledForAutomation,
      frankingType
    } = req.body;

    const result = await getPostwurfspezialPreis(
      quantity,
      lengthInDeciMm,
      widthInDeciMm,
      heightInDeciMm,
      weightInGram,
      inductionDate,
      mailingItemTypePostcard,
      notEnabledForAutomation,
      frankingType
    );

    res.json(result);
  } catch (error) {
    console.error('Error en /preis/postwurfsp:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
