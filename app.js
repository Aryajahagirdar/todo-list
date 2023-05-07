//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

var day;

mongoose.connect("mongodb://localhost:27017/todolistDB", {useNewUrlParser: true});

const itemsSchema = {
  name: String
};

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
    name: "Welcome to your To-Do List!"
});

const item2 = new Item({
  name: "Add to your list"
});

const item3 = new Item({
  name: "<-- Delete from your list"
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
}

const List = mongoose.model("List", listSchema);

app.get("/", function(req, res) {

  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  var today = new Date();
  day = today.toLocaleDateString('en-US', options);

  Item.find({}).then((items) => {
    if(items.length===0){
      Item.insertMany(defaultItems).then(function(){
        console.log("Successfully saved defult items to DB");
      }).catch(function (err) {
        console.log(err);
      });
      res.redirect("/");
    }
    else{
      res.render("list", {listTitle: day, newListItems: items});
    }
    
   })

});

app.get('/:customListName', async (req, res) => {
  const customListName = _.capitalize(req.params.customListName);

  try {
    const foundLists = await List.find({ name: customListName });
    if (foundLists.length > 0) {
      // list already exists
      const listName = foundLists[0].name;
      res.render("list", { listTitle: customListName, newListItems: foundLists[0].items });
    } else {
      // create new list
      const list = new List({
        name: customListName,
        items: defaultItems,
      });

      await list.save();
      res.redirect("/" + customListName);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/", function(req, res){
  const itemName = req.body.newItem.trim(); // Trim the input to remove leading/trailing whitespace
  const listName = req.body.list;
  
  if (itemName !== ''){

    const itemToBeInserted = new Item({
      name: itemName
    });  

    if(listName === day) {
      itemToBeInserted.save();
      res.redirect("/");
    } else {
      List.find({name: listName}).exec()
        .then((foundListItems) => {
          if (foundListItems && foundListItems.length > 0) {
            foundListItems[0].items.push(itemToBeInserted);
            return foundListItems[0].save();
          } else {
            console.log("List not found");
          }
        
        })
        .then(() => {
          res.redirect("/"+listName);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  } else {
    res.redirect(req.get('referer')); // Redirect to the same page
  }
});

app.post("/delete", async function(req, res) {
  const checkedItem = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === day) {
    await Item.findByIdAndRemove(checkedItem).exec();
    res.redirect("/");
  } else {
    try {
      const foundLists = await List.find({ name: listName });
      foundLists.forEach((foundList) => {
        const updatedItems = foundList.items.filter((item) => item._id != checkedItem);
        foundList.items = updatedItems;
        foundList.save();
      });
      res.redirect("/" + listName);
    } catch (err) {
      console.log(err);
    }
  }
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
