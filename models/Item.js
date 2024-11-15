const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  bookId: { type: String, required: true, unique: true },
  bookTitle: { type: String, required: true },
  borrowDate: { type: Date, required: true }, // use the date of today
  returnDate: { type: Date, required: true }  // the date of borrowing + 7days
});

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;