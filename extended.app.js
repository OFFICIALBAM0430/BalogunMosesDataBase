const express = require('express');
const mongoose = require('mongoose');
const app = express();

const port = 4555;

app.use(express.json());

const databaseConnection = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/techSchoolApp');
    console.log('Database connected successfully');
  } catch (error) {
    console.log('Database connection failed', error);
  }
};

databaseConnection();

app.get('/', (req, res) => {
  res.send('Hello World');
});

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: Number,
  email: { type: String, required: true, unique: true },
  phone: String,
  address: String,
  course: { type: String, minlength: 2 },
  institution: String
});

const Student = mongoose.model('Student', studentSchema);
const hasValidId = (id) => mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);

const validationMessage = (error) => {
  const firstError = Object.values(error.errors || {})[0];
  return firstError ? firstError.message : 'Invalid student data';
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

app.post('/create-student', async (req, res) => {
  const { name, age, email, phone, address, course, institution } = req.body || {};
  try {
    const student = new Student({ name, age, email, phone, address, course, institution });
    await student.save();
    return res.status(200).json({ message: 'Student created successfully', student });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: 'A student with that email already exists' });
    }
    if (error && error.name === 'ValidationError') {
      return res.status(400).json({ message: validationMessage(error) });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/get-students', async (req, res) => {
  try {
    const students = await Student.find();
    return res.status(200).json({ message: 'Students fetched successfully', students });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/search-students', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    return res.status(400).json({ message: 'Query parameter q is required and cannot be empty' });
  }

  try {
    const pattern = new RegExp(escapeRegex(q), 'i');
    const students = await Student.find({
      $or: [{ name: pattern }, { email: pattern }, { course: pattern }]
    });
    return res.status(200).json(students);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/get-student/:id', async (req, res) => {
  const { id } = req.params;
  if (!hasValidId(id)) {
    return res.status(400).json({ message: 'Invalid student id' });
  }

  try {
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    return res.status(200).json({ message: 'Student fetched successfully', student });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/update-student/:id', async (req, res) => {
  const { id } = req.params;
  const { name, age, email, phone, address, course, institution } = req.body || {};
  if (!hasValidId(id)) {
    return res.status(400).json({ message: 'Invalid student id' });
  }

  try {
    const student = await Student.findByIdAndUpdate(
      id,
      { name, age, email, phone, address, course, institution },
      { new: true, runValidators: true }
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    return res.status(200).json({ message: 'Student updated successfully', student });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: 'A student with that email already exists' });
    }
    if (error && error.name === 'ValidationError') {
      return res.status(400).json({ message: validationMessage(error) });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/get-student-by-name', async (req, res) => {
  const { name } = req.query;
  try {
    const student = await Student.find({ name });
    return res.status(200).json({ message: 'Student fetched successfully', student });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch('/students/:id/course', async (req, res) => {
  const { id } = req.params;
  const course = typeof req.body?.course === 'string' ? req.body.course.trim() : '';
  if (!hasValidId(id)) {
    return res.status(400).json({ message: 'Invalid student id' });
  }
  if (!course) {
    return res.status(400).json({ message: 'Course is required and cannot be empty' });
  }

  try {
    const student = await Student.findByIdAndUpdate(
      id,
      { $set: { course } },
      { new: true, runValidators: true }
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    return res.status(200).json({ message: 'Student course updated successfully', student });
  } catch (error) {
    if (error && error.name === 'ValidationError') {
      return res.status(400).json({ message: validationMessage(error) });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/delete-student/:id', async (req, res) => {
  const { id } = req.params;
  if (!hasValidId(id)) {
    return res.status(400).json({ message: 'Invalid student id' });
  }

  try {
    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found; it may already be gone' });
    }
    return res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});