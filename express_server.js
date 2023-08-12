const express = require("express");
const cookieSession = require("cookie-session");
const app = express();
const PORT = 8080;
const bcrypt = require("bcryptjs");
const { urlDatabase, users, getUserByEmail, urlsForUser, generateRandomString } = require("./helpers");

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: "session",
  keys: ["key1", "key2"],
}));

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
    res.status(403).send("HTTP ERROR 403: URL not found. <a href='/login'>Login</a>");
  } else {
    const longURL = urlDatabase[req.params.id].longURL;
    res.redirect(longURL);
  }
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  if (!users[req.session.user_id]) {
    res.status(401).send("HTTP ERROR 401: You are not logged in. <a href='/login'>Try again</a>");
  } else {
    urlDatabase[shortURL] = { longURL: req.body.longURL, userID: req.session.user_id };
    res.redirect(`/urls/${shortURL}`);
  }
});

app.post("/urls/:id/delete", (req, res) => {
  const id = req.params.id;
  const currentUser = req.session.user_id;
  if (!currentUser) {
    return res.status(401).send("HTTP ERROR 401: You are not logged in.<a href='/login'>Try again</a>");
  }
  if (!urlDatabase[id]) {
    return res.status(404).send("HTTP ERROR 404: URL not found.<a href='/login'>Try again</a>");
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
    return res.status(401).send("HTTP ERROR 401: Please log in.<a href='/login'>Try again</a>");
  }
  if (!urlDatabase[id]) {
    return res.status(404).send("HTTP ERROR 404: URL not found.<a href='/login'>Try again</a>");
  }
  if (currentUser === urlDatabase[id].userID) {
    const longURL = urlDatabase[id].longURL;
    const templateVars = {
      id: id, longURL: longURL, user: users[req.session.user_id]
    };
    return res.render("urls_show", templateVars);
  } else {
    return res.status(403).send("HTTP ERROR 403: You do not have authorization to view this.<a href='/login'>Try again</a>");
  }
});

app.post("/urls/:id", (req, res) => {
  const id = req.params.id;
  const currentUser = req.session.user_id;
  if (!currentUser) {
    return res.status(401).send("HTTP ERROR 401: Please log in.<a href='/login'>Try again</a>");
  }
  if (!urlDatabase[id]) {
    return res.status(404).send("HTTP ERROR 404: URL not found.<a href='/login'>Try again</a>");
  }
  if (currentUser === urlDatabase[id].userID) {
    urlDatabase[id].longURL = req.body.longURL;
    return res.redirect("/urls");
  } else {
    return res.status(403).send("HTTP ERROR 403: You do not have authorization to edit this.<a href='/login'>Try again</a>");
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
  const user = getUserByEmail(req.body.email);
  const hashedPassword = bcrypt.hashSync(req.body.password, 10);
  if (user || !req.body.email || !req.body.password) {
    return res.status(400).send("HTTP ERROR 400: Invalid registration details.<a href='/login'>Try again</a>");
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
  const user = getUserByEmail(req.body.email);
  if (!user) {
    return res.status(403).send("HTTP ERROR 403: Invalid credentials. <a href='/login'>Try again</a>");
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

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});