# 📤 Book Upload Guide

## Overview

The BookClub application now relies **100% on SQLite database**. You can add books through the web interface without needing the `books/` folder anymore!

## Adding Books via Web Interface

### 1. Navigate to Upload Page

Click the **"+ Add Book"** button in the navigation bar (green button on the right).

### 2. Fill Out the Form

#### Book Cover (Optional)
- Click the upload area or drag & drop an image
- Supported formats: PNG, JPG, WEBP
- Max size: 5MB
- Image is stored directly in the database as binary data

#### Title (Required)
- Enter the book title
- Must be unique
- Used to generate book ID

#### Description (Optional)
- Enter a brief description of the book
- Supports multi-line text

#### Genres
- Type a genre name and press **SPACE** to add it
- Press **SPACE** multiple times to add multiple genres
- Click the **×** button to remove a genre
- Press **BACKSPACE** on empty input to remove last genre

### 3. Submit

Click **"Add Book"** to save to the database. You'll be automatically redirected to the book detail page.

## Features

### Genre Tag Input
- **Space** = Add genre
- **Backspace** = Remove last genre (when input is empty)
- **Click ×** = Remove specific genre
- **Paste** = Add multiple genres at once (space/comma/semicolon separated)

### Validation
- Title is required
- Duplicate titles are rejected
- Images must be under 5MB
- Only image files are accepted

### Cover Images
- Preview shows after selecting
- Click "Remove" to change image
- Images stored as BLOBs in SQLite
- Served as base64 data URLs

## API Endpoint

```http
POST /api/books
Content-Type: multipart/form-data

Fields:
- title: string (required)
- description: string (optional)
- genres: JSON array of strings (optional)
- cover: file upload (optional)
```

## No More books/ Folder Dependency

✅ **Old Way**: Add book to `books/` folder → Reinitialize database
❌ **New Way**: Use web interface → Instantly available

The `books/` folder is now **optional**:
- Only needed for initial database seeding
- Can be deleted after first initialization
- All images stored in database
- No file system dependencies

## Database Storage

Books are stored in SQLite with:
- **id**: Generated from title (lowercase, underscores)
- **title**: Book title
- **description**: Book description
- **cover**: Binary BLOB (image data)
- **genres**: Linked via `book_genres` junction table

## Examples

### Minimal Book
```
Title: "The Great Gatsby"
Description: (empty)
Genres: (none)
Cover: (none)
```

### Complete Book
```
Title: "1984"
Description: "A dystopian novel by George Orwell..."
Genres: ["Fiction", "Dystopian", "Political"]
Cover: uploaded_image.png
```

## Troubleshooting

### "A book with this title already exists"
- Change the title slightly
- Or delete the existing book first

### "Only image files are allowed"
- Use PNG, JPG, WEBP, or GIF
- Don't use PDFs, documents, etc.

### "Image must be less than 5MB"
- Compress your image
- Use lower resolution
- Convert to JPG for smaller size

### Upload button not working
- Check that backend server is running
- Check browser console for errors
- Verify you have space in database

## Future Enhancements

Possible additions:
- Edit existing books
- Delete books
- Bulk upload
- Import from external APIs
- Author field
- Publication year
- ISBN lookup

