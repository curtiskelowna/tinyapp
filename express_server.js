const express = require("express");
const cookieSession = require("cookie-session");
const app = express();
const PORT = 8080; // default port 8080
const bcrypt = require("bcryptjs");

app.set("view engine", "ejs");

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
};

app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: "session",
  keys: ["key1", "key2"],
}));

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

const generateRandomString = function() {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const getUserByEmail = function(users, email) {
  for (let id in users) {
    if (users[id].email === email) {
      return users[id];
    }
  }
};

const lookUpUser = function(email) {
  for (let id in users) {
    if (users[id].email === email) {
      return users[id];
    }
  }
};

const urlsForUser = function(id) {
  let userURLs = {};
  for (let shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      userURLs[shortURL] = urlDatabase[shortURL];
    }
  }
  return userURLs;
};

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/urls", (req, res) => {
  const userID = req.session.user_id;
  const userURLs = urlsForUser(userID);
  const templateVars = {
    urls: userURLs,
    user_id: req.session.user_id,
    user: users[req.session.user_id]
  };
  if (!req.session.user_id) {
    res.redirect("/login");
  } else {
    res.render("urls_index", templateVars);
  }
});

app.get("/urls/new", (req, res) => {
  const user = users[req.session.user_id];
  if (!user) {
    res.redirect("/login");
  } else {
    const templateVars = { user: users[req.session.user_id] };
    res.render("urls_new", templateVars);
  }
});

app.get("/u/:id", (req, res) => {
  const shortURL = urlDatabase[req.params.id];
  if (!shortURL) {
    res.status(403).send("HTTP ERROR 403: URL not found.");
  } else {
    const longURL = urlDatabase[req.params.id].longURL;
    res.redirect(longURL);
  }
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  if (!users[req.session.user_id]) {
    res.status(401).send("HTTP ERROR 401: You are not logged in.");
  } else {
    urlDatabase[shortURL] = { longURL: req.body.longURL, userID: req.session.user_id };
    res.redirect(`/urls/${shortURL}`);
  }
});

app.post("/urls/:id/delete", (req, res) => {
  const id = req.params.id;
  const currentUser = req.session.user_id;
  if (!currentUser) {
    return res.status(401).send("HTTP ERROR 401: You are not logged in.");
  }
  if (!urlDatabase[id]) {
    return res.status(404).send("HTTP ERROR 404: URL not found.");
  }
  if (currentUser === urlDatabase[id].userID) {
    delete urlDatabase[id];
    return res.redirect("/urls");
  } else {
    return res.status(403).send("HTTP ERROR 403: You do not have authorization to delete this.");
  }
});

app.get("/urls/:id", (req, res) => {
  const id = req.params.id;
  const currentUser = req.session.user_id;
  if (!currentUser) {
    return res.status(401).send("HTTP ERROR 401: Please log in.");
  }
  if (!urlDatabase[id]) {
    return res.status(404).send("HTTP ERROR 404: URL not found.");
  }
  if (currentUser === urlDatabase[id].userID) {
    const longURL = urlDatabase[id].longURL;
    const templateVars = {
      id: id, longURL: longURL, user: users[req.session.user_id]
    };
    return res.render("urls_show", templateVars);
  } else {
    return res.status(403).send("HTTP ERROR 403: You do not have authorization to view this.");
  }
});

app.post("/urls/:id", (req, res) => {
  const id = req.params.id;
  const currentUser = req.session.user_id;
  if (!currentUser) {
    return res.status(401).send("HTTP ERROR 401: Please log in.");
  }
  if (!urlDatabase[id]) {
    return res.status(404).send("HTTP ERROR 404: URL not found.");
  }
  if (currentUser === urlDatabase[id].userID) {
    urlDatabase[id].longURL = req.body.longURL;
    return res.redirect("/urls");
  } else {
    return res.status(403).send("HTTP ERROR 403: You do not have authorization to edit this.");
  }
});

app.get("/register", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    const templateVars = {
      user: users[req.session.user_id]
    };
    res.render("urls_registration", templateVars);
  }
});

app.post("/register", (req, res) => {
  const user = lookUpUser(req.body.email);
  const hashedPassword = bcrypt.hashSync(req.body.password, 10);
  if (user || !req.body.email || !req.body.password) {
    return res.status(400).send("HTTP ERROR 400: Invalid registration details.");
  } else {
    const id = generateRandomString();
    const email = req.body.email;
    const newUser = {
      id: id,
      email: email,
      password: hashedPassword
    };
    users[id] = newUser;
    console.log(users);
    req.session.user_id = id;
    res.redirect("/urls");
  }
});

app.get("/login", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    const templateVars = {
      user: users[req.session.user_id]
    };
    res.render("urls_login", templateVars);
  }
});

app.post("/login", (req, res) => {
  const user = lookUpUser(req.body.email);
  if (!user) {
    return res.status(403).send("HTTP ERROR 403: Invalid credentials, please register if you don't have an account.");
  }
  if (!bcrypt.compareSync(req.body.password, user.password)) {
    return res.status(400).send("HTTP ERROR 400: Invalid credentials.");
  }
  req.session.user_id = user.id;
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});