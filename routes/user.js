const { response } = require("express");
var express = require("express");
const async = require("hbs/lib/async");
const { Db } = require("mongodb");
var router = express.Router();
const productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-hepers");

const serviceSsid = "VA853a986f6220d20e98db1060e8fd5d22";
const AccountSsid = "ACa9fb707809f831f236ac61507083c641";
const token = "130e8f058126d5c7470bfcaa39a55211";
const client = require("twilio")(AccountSsid, token);

const verifylogin = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};
// ==========my details===============

// const mydetails = (req, res, next) => {
//   if (!profiledata) {
//     next();
//   } else {
//     res.redirect("/myProfile");
//   }
// };



/* GET home page. */
router.get("/", async function (req, res, next) {
  let user = req.session.user;
  console.log(user);
  cartCount=null
  if (req.session.user) {
    var cartCount=await userHelpers.getCarCount(req.session.user._id)
  }
  
  productHelpers.getAllproducts().then((products) => {
    productHelpers.getAllcategory().then((category) => {
      res.render("user/view-products", { products, user, category ,cartCount});
    });
  });
});
router.get("/login", (req, res) => {
  if (req.session.loggedIn) {
    res.redirect("/");
  } else {
    res.render("user/login", { loginErr: req.session.loginErr });
    req.session.loginErr = false;
  }
});
router.get("/signup", (req, res) => {
  res.render("user/signup");
});

router.post("/signup", (req, res) => {
  let email = req.body.email;
  let phone = req.body.phoneNumber;
 
  
  console.log(email);
  console.log(phone);
  userHelpers.emailCheck(email, phone).then((resolve) => {
    if (resolve) {
      if (resolve.phoneNumber == phone) {
        res.render("user/signup", { phone: true, phoneAll: "phone invaid" });
        phoneAll = false;
      } else {
        res.render("user/signup", { email: true });
        email = false;
      }
    } else {
      userHelpers.doSignup(req.body).then((response) => {
        console.log(response);
        res.redirect("/login");
      });
    }
  });
});

router.post("/login", (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    console.log(response.userBlock);
    if (response.userBlock) {
      res.render("user/login", { userBlock: true });
    } else {
      if (response.status) {
        req.session.loggedIn = true;
        req.session.user = response.user;
        console.log(req.session.user._id);
        res.redirect("/");
      } else {
        req.session.loginErr = true;
        res.redirect("/login");
      }
    }
  });
});
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});


//cart routes
router.get("/cart", verifylogin, async (req, res) => {
  let products=await userHelpers.getCartProducts(req.session.user._id)
  let totalValue=await userHelpers.getTotalAmount(req.session.user._id)

  cartCount=null
  if (req.session.user) {
    var cartCount=await userHelpers.getCarCount(req.session.user._id)
  }
  
  res.render("user/cart",{products,'user':req.session.user,cartCount,totalValue});
});
router.get('/add-to-cart/:id',(req,res)=>{
  console.log(req.params.id);
  console.log("hi");
  console.log(req.session.user._id);
  
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
    
  })
 

})

// wishlist ----------------------------------

router.get("/wishlist", verifylogin, async (req, res) => {
  let products=await userHelpers.getWishProducts(req.session.user._id)
  // let totalValue=await userHelpers.getTotalAmount(req.session.user._id)

 console.log(products);
  res.render("user/wishlist",{products,'user':req.session.user});
});

router.get('/add-to-wishlist/:id',verifylogin,(req,res)=>{
  userHelpers.addToWishlist(req.params.id,req.session.user._id).then(()=>{
    res.redirect("/")

  })


})
 




// wishlist




router.get("/view-image/:id", async(req, res) => {
  // let product = await productHelpers.getAllproductsDetails(req.params.id)
  var imgId = req.params.id;
  let product = await userHelpers.imageDetails(imgId);
  let relatedpro = await product.category;
  console.log(relatedpro);
  let relatedproduct=await userHelpers.getrelatedproducts(relatedpro)
  console.log(relatedproduct);
  cartCount=null
  if (req.session.user) {
    var cartCount=await userHelpers.getCarCount(req.session.user._id)
  }
  
  res.render("user/view-image", { product,user:req.session.user,cartCount,relatedproduct});
  // res.render("user/single-product",{product});
});

//otp verfication

router.get("/verify-phone", (req, res) => { 
  res.render("user/verify-phone");
});
router.post("/verify-phone", (req, res) => {
  let phone = req.body.phoneVerify;
  userHelpers.checkPhone(phone).then((number) => {
    // console.log(number);
    // console.log(number.userBlock)

    if (number) {
      if (number.userBlock) {
        res.render("user/verify-phone", { userBlock: true });
      } else {
        if (number) {
          let phone = number.phoneNumber;
          console.log(phone);
          client.verify
            .services(serviceSsid)
            .verifications.create({ to: `+91${phone}`, channel: "sms" })
            .then((resp) => {
              console.log(resp);
            });
          res.render("user/verify-otp", { phone });
        } else {
          res.render("user/verify-phone", { number: true });
          number = false;
        }
      }
    } else {
      res.render("user/verify-phone", { number: true });
      number = false;
    }
  });
});

router.post("/verify-otp/:phone", (req, res) => {
  let phone = req.params.phone;
  let otp = req.body.phoneVerify;
  console.log(phone);

  client.verify
    .services(serviceSsid)
    .verificationChecks.create({
      to: `+91${phone}`,
      code: otp,
    })
    .then((resp) => {
      console.log("otp res", resp);
      const user = resp.valid;

      if (user) {
        userHelpers.doLoginOtp(phone).then((response) => {
          if (response) {
            console.log(response.name);
            req.session.loggedIn = true;
            req.session.user = response;
            res.redirect("/");
          } else {
            req.session.loginErr = true;
            res.redirect("/login");
          }
        });
        console.log("success");
        req.session.loggedIn = true;
        req.session.user = response.user;
      } else {
        console.log("failed");

        res.render("user/verify-otp", { phone, number: true });
        number = false;
      }
    });
});

router.get('/resent-otp/:phone',(req,res)=>{
  let phone=req.params.phone
  console.log("my"+phone);
  client.verify
  .services(serviceSsid)
  .verifications.create({ to: `+91${phone}`, channel: "sms" })
  .then((resp) => {
    console.log(resp);
  });
  res.render("user/verify-otp",{phone});



})

//category view
router.get('/category-view/:id',(req,res)=>{
  let category=req.params.id
  userHelpers. categoryView(category).then((products)=>{
  console.log(products);
  res.render('user/view-category',{products,user:req.session.user})
  
  })

})

// quantity
router.post('/change-product-quantity',(req,res,next)=>{
  console.log(req.body);
  
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
  
     response.total=await userHelpers.getTotalAmount(req.body.user)
  
  res.json(response)
  })
})
router.post('/remove-product-cart',(req,res)=>{
  userHelpers.removeCartProduct(req.body).then((response)=>{
    res.json(response)
  })
})




//product orders

router.get('/place-order',verifylogin,async(req,res)=>{
  let total=await userHelpers.getTotalAmount(req.session.user._id)
  
  res.render('user/Add-address',{total,user:req.session.user})
})
router.post('/place-order',async(req,res)=>{
  let products=await userHelpers.getCartProductList(req.body.userId)
  let totalPrice=await userHelpers.getTotalAmount(req.body.userId)

userHelpers.placeOrder(req.body,products,totalPrice).then((response)=>{
  res.json({status:true})

})

router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})
  console.log(req.body);
})


router.get('/orders',verifylogin,async(req,res)=>{
  console.log(req.session.user?._id);
  let orders=await userHelpers.getUserOrders(req.session.user?._id)
res.render('user/orders',{user:req.session.user,orders})
})


// ------------view-orders from order--------
router.get('/view-order-products/:id',async(req,res)=>{
  var imgId = req.params.id;
  let product = await userHelpers.imageDetails(req.params.id);
  // let product=await userHelpers.getOrderProducts(req.params.id)
   res.render('user/view-order-products',{product})
  // res.render("user/view-image",{product});
})


router.get('/arun',async(req,res)=>{
  // let category=req.params.id
  // userHelpers. categoryView(category).then((products)=>{
  // console.log(products);
  res.render("user/single-product")
  })
  
// ============================my profile=======================
router.get("/myprofile",async(req,res)=>{
  let profile=await userHelpers.getMydetals(req.session.user?._id)
  
  res.render("user/myprofile",{profile})

});

// ==================================add details======================

router.get("/add-details",verifylogin,async(req,res)=>{
  let details = await userHelpers.addToProfile(req.session.user._id)
  res.render("user/profile-Details")

  
})





module.exports = router;
