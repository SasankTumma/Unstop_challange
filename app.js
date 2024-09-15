const express = require('express');
const mongoose = require('mongoose');

const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors());


// MongoDB Connection
mongoose.connect("mongodb+srv://sasank:123@cluster0.ulecm.mongodb.net/trainReservations?retryWrites=true&w=majority", {
  serverSelectionTimeoutMS: 5000
}).then(() => {
  console.log('newly ?? Connected to MongoDB Atlas');
}).catch(err => {
  console.error('Error connecting to MongoDB Atlas:', err.message);
});

const seatSchema = new mongoose.Schema({
  seatStatus: {
    type: String,
    required: true,
    default: "0".repeat(80) // Initialize 80 seats as available ('000...0')
  }
});

const Seat = mongoose.model('Seat', seatSchema);
app.use(express.json()); // To parse JSON body

// Endpoint to get the current seat status
app.get('/seats', async (req, res) => {
  try {
    let seatData = await Seat.findOne(); // Fetch seat data
    if (!seatData) {
      // Initialize if not available
      seatData = new Seat();
      await seatData.save();
    }
    res.json({ all_seats: seatData.seatStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch seat data' });
  }
});

// Logic to reserve seats with last row having 3 seats
const reserveSeats = (allSeats, numSeats) => {
  let reservedSeats = [];
  let seatsArray = allSeats.split('');
  const rows = 11; // 11 rows (10 rows of 7 and 1 row of 3)

  // Try to find available seats in one row first (including last row)
  for (let i = 0; i < seatsArray.length; i += 7) {
    let rowSize = i === 77 ? 3 : 7; // Handle the last row separately (3 seats)
    const row = seatsArray.slice(i, i + rowSize);
    const availableSeats = row.map((seat, index) => seat === '0' ? index : null).filter(index => index !== null);

    if (availableSeats.length >= numSeats) {
      // Reserve seats in this row
      for (let j = 0; j < numSeats; j++) {
        seatsArray[i + availableSeats[j]] = '1';
        reservedSeats.push(i + availableSeats[j]);
      }
      return { updatedSeats: seatsArray.join(''), reservedSeats };
    }
  }

  // If not enough seats in a row, reserve the nearby available seats
  for (let i = 0; i < seatsArray.length; i++) {
    if (seatsArray[i] === '0') {
      seatsArray[i] = '1';
      reservedSeats.push(i);
      if (reservedSeats.length === numSeats) {
        return { updatedSeats: seatsArray.join(''), reservedSeats };
      }
    }
  }

  return { updatedSeats: seatsArray.join(''), reservedSeats };
};

// Endpoint to reserve seats
app.post('/reserve', async (req, res) => {
  const { numSeats } = req.body;

  if (numSeats < 1 || numSeats > 7) {
    return res.status(400).json({ error: 'Invalid number of seats. You can reserve between 1 and 7 seats.' });
  }

  try {
    let seatData = await Seat.findOne();
    if (!seatData) {
      seatData = new Seat();
    }

    const { updatedSeats, reservedSeats } = reserveSeats(seatData.seatStatus, numSeats);

    seatData.seatStatus = updatedSeats;
    await seatData.save();

    res.json({ success: true, reservedSeats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reserve seats' });
  }
});

// Start the server
app.listen(5000, function() {
  console.log('Server is running on http://localhost:5000');
});


const path = require('path');

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Root route to serve the index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
