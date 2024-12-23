import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import ejs from "ejs";
import methodOverride from "method-override";
import { type } from "os";

const app = express();
const port = 3000; 
const posts = [];

if (fs.existsSync('post.txt')) {
  const postContent = fs.readFileSync('post.txt', 'utf8');
  const postsArray = postContent.split('\n');
  postsArray.forEach((post) => {
    if (post) {
      try {
        posts.push(JSON.parse(post)); // safely parse JSON
      } catch (err) {
        console.error('Error deleting post:', err);
      }
    }
  });
};

const allPosts = posts.map((post) => {
  console.log("Mapping Post:", post);
  return {
    ...post,
    type: post.dropdown // Use dropdown value as type
  };
});
const d = new Date();
let year = d.getFullYear();


app.use(methodOverride("_method"));

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static("public"));

app.get("/", (req, res) => {
    const data = {
      year: year
    }
    res.render("index.ejs", data);
});

app.get("/publish", (req, res)=> {
  const data = {
    year: year
  }
    res.render("post.ejs", data);
  });

  app.get("/about", (req, res) => {
    const data = {
      year: year
    }
    res.render("about.ejs", data);
  });

  app.get("/faqs", (req, res) => {
    const data = {
      year: year
    }
    res.render("faq.ejs", data);
  });

  app.get("/search", (req, res) => {
    const query = req.query.q ? req.query.q.toLowerCase() : "";
    const filteredPosts = allPosts.filter((post) => post.title.toLowerCase().trim().includes(query));

    console.log("All Posts Before Search:", allPosts);
    console.log("Query:", query);
    console.log("Titles:", allPosts.map((post) => post.title.toLowerCase()));
    console.log("Titles:", allPosts.map((posted) => posted.title.toLowerCase()));
    console.log("Posts Before Mapping:", posts);


    res.render("search.ejs", {filteredPosts, query, year});
  });


  app.post('/publish-form', (req, res) => {
    const { dropdown, author, title, email, comment } = req.body;
  
    if (!dropdown || !author || !title || !email || !comment) {
      return res.status(400).send('Please fill in all fields.');
    }
  
    const publish = {dropdown, author, title, email, comment };
    posts.push(publish);
    fs.appendFile("post.txt", JSON.stringify(publish) + "\n", (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error publishing post.');
      }
      if (dropdown === "books") {
        res.render("books.ejs");
      } 
      else if (dropdown === "articles") {
        res.render("article.ejs");
      }
      else if (dropdown === "essays") {
        res.render("essay.ejs");
      }else {
      res.render("saved.ejs");
    }
    });
    console.log(`A new post has been published`);
  });

  app.get('/article', (req, res) => {
    const data = {
      year: year,
      articlePosts: posts.filter((post) => post.dropdown === "articles")
    };
    res.render('article.ejs', data);
  });

  app.get('/essay', (req, res) => {
    const data = {
      year: year,
      essayPosts: posts.filter((post) => post.dropdown === "essays")
    };
    console.log("all posts:", posts);
    console.log("essay posts:", data.essayPosts);
    res.render('essay.ejs', data);
});


  
app.get("/books", (req, res) => {
  const data = {
    year: year,
    bookPosts: posts.filter((post) => post.dropdown === "books")
  };
  res.render('books.ejs', data);
});


app.get('/comment/:dropdown/:title', (req, res) => {
  const { dropdown, title} = req.params;
  const data = {
    year: year
  }

  console.log("Route params:", req.params);

  if (!dropdown || !title) {
    return res.status(400).send("Invalid request: Missing type or title.");
  }

  const allPosts = posts.map((post) => ({
    ...post,
    type: post.dropdown,
  }));
 
  console.log("All Posts:", allPosts);
  console.log("Received Type:", type);
  console.log("Received Title:", title);
  
  const posted = allPosts.find((post) => post.dropdown === decodeURIComponent(dropdown) && post.title === decodeURIComponent(title));
  if (posted) {
    res.render('comment.ejs', {...data, posted }); // Render a new page that displays the comment
  } else {
    res.status(404).send('Post not found');
  }
});

app.get('/books/:email/edit', (req, res) => {
  console.log('Edit route called!');
  const email = req.params.email;
  const post = posts.find((post) => post.email === email);
  console.log(post);
  if (!post) {
    res.status(404).send('Post not found');
     }if (email !== post.email) {
      return res.render("edit.ejs", { 
      errorMessage: "Invalid email, Unauthorized to edit", 
      post
    });
  }
   else {
    res.render('edit.ejs', { post, errorMessage: null }); 
  }
});

app.patch('/books/:email', (req, res) => {
  const email = req.params.email;
  const post = posts.find((post) => post.email === email);
  if (!post) {
    res.status(404).send('Post not found');
  }
  if (email !== req.body.hiddenEmail) { 
    return res.render("edit.ejs", {
    post,
    errorMessage: "Invalid email, Unauthorized to edit"
  });
  } 
    if (!req.body.content || req.body.content.trim() === "") {
      return res.status(400).send("Content cannot be empty.");
    }
    
    post.comment = req.body.content;
    const updatedPosts = posts.map((p) => JSON.stringify(p)).join("\n");
    fs.writeFile("post.txt", updatedPosts + "\n", (err) => {
      if (err) {
        console.error('Error updating the post file:', err);
        return res.status(500).send('Error saving the updated post.');
      }
    });

    res.render("update.ejs", { message: "Post successfully deleted"});
  });

app.get("/books/:email/delete", (req,res) => {
  const email = req.params.email;
  const post = posts.find((post) => post.email === email );
  if (!post) {
    return res.status(404).send("Post not found");
  } 
  if (email !== post.email) {
      return res.render("delete1.ejs", { 
      errorMessage: "Invalid email, Unauthorized to delete", 
      post
    });
  }
  res.render("delete1.ejs", { post, errorMessage: null});
});


app.post('/books/:email/delete', (req, res) => {
  const email = req.params.email;
  const post = posts.find((post) => post.email === email ); 
  const postIndex = posts.findIndex((post) => post.email === email);
  if (postIndex === -1) {
    res.status(404).send('Post not found');
  }  

  console.log("Email from params:", email);
  console.log("Email from body:", req.body.email);
  console.log("email from body:", req.body.hiddenEmail);

  if (email !== req.body.hiddenEmail) {
      return res.render("delete1.ejs", {
      post,
      errorMessage: "Invalid email, Unauthorized to delete"
    });
    //res.status(403).send("Invalid email, unauthorized to delete");
  }
  posts.splice(postIndex, 1);
  const updatedPosts = posts.map((p) => JSON.stringify(p)).join("\n");

  fs.writeFile("post.txt", updatedPosts + "\n", (err) => {
    if(err)
      console("error deleting post", err);
    return res.status(404).send("Error deleting post.");
  });
    
    res.render("delete.ejs", { message: "Post successfully deleted"});
  });


app.listen(port, ()=> {
    console.log(`Listening on port ${port}`);
});