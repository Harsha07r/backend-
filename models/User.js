// backend/models/User.js

const mongoose = require('mongoose');
const validator = require('validator');

// Define user schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    //Inbuilt Validator Library function
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error("Email is not valid");
      }
    }
  },
  password: {
    type: String,
    required: true,
    validate(value){
        if(!validator.isStrongPasswordd(value)){
            throw new Error("Password is not valid");
        }
    }
  }
}, {
  timestamps: true 
});

// Export the model
module.exports = mongoose.model('User', userSchema);
