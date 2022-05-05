const { response } = require("express");
let express = require("express");
const async = require("hbs/lib/async");
const { Db } = require("mongodb");
const { getOrderProductDetails } = require("../helpers/product-helpers");
var router = express.Router();
const productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-hepers");
const swal = require( 'sweetalert');


const serviceSsid = "	VA57b99e042133ed4144f37b3003e009b8";
const AccountSsid = "AC8d35f9dcfb5c3192cf04162426e70fa1";
const token = "0421b11737a011c00724f19f66dfa8f1";
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
      productHelpers.getAllcarousel().then((carousel) => {
      
       
      //  let ok = offerprice
      //  console.log(ok);
      res.render("user/view-products", { products, user, category ,cartCount,carousel});
    });
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
// =============================================signUppage==================
router.get("/signup", (req, res) => {
  res.render("user/signup");
});

router.post("/signup", (req, res) => {
  let email = req.body.email;
  let phone = req.body.phoneNumber;
 



  // userHelpers.checkPhone(phone).then((number) => {
  //   // console.log(number);
  //   // console.log(number.userBlock)

  //   if (number) {
  //     if (number.userBlock) {
  //       res.render("user/verify-phone", { userBlock: true });
  //     } else {
  //       if (number) {
  //         let phone = number.phoneNumber;
  //         console.log(phone);
  //         client.verify
  //           .services(serviceSsid)
  //           .verifications.create({ to: `+91${phone}`, channel: "sms" })
  //           .then((resp) => {
  //             console.log(resp);
  //           });
  //         res.render("user/verify-otp", { phone });
  //       } else {
  //         res.render("user/verify-phone", { number: true });
  //         number = false;
  //       }
  //     }
  //   } else {
  //     res.render("user/verify-phone", { number: true });
  //     number = false;
  //   }
  // });


  
  userHelpers.emailCheck(email, phone).then((resolve) => {
    if (resolve) {
      if (resolve.phoneNumber == phone) {
        res.render("user/signup", { phone: true, phoneAll: "Phone invalid" });
        phoneAll = false;
      } else {
        res.render("user/signup", { email: true,email:"Email already exist" });
        email = false;
      }
    } else {
      userSignup=req.body;
      console.log(phone);
      client.verify
        .services(serviceSsid)
        .verifications.create({ to: `+91${phone}`, channel: "sms" })
        .then((resp) => {
          console.log(resp);
          res.render("user/signUpotp", { phone });
        });
     
    
    }
  });
});



// =============================otpsignup=============================

router.get('/signupOtp',(req,res)=>{
  console.log(req.body+"ffffffffffffff");
  res.header(
    "Cache-Control",
    "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
  );
  let phoneNumber=req.query.phonenumber;
  let otpNumber=req.query.otpnumber;
  console.log(phoneNumber);
  console.log(otpNumber);

  client.verify
        .services(serviceSsid)
        .verificationChecks.create({
        to: "+91"+phoneNumber,
        code:otpNumber,
      }).then((resp)=>{
        console.log("tttt",resp);
        if(resp.valid){
          userHelpers.doSignup(userSignup).then((response)=>{
            console.log("haaa",response);
            if(response.acknowledged){
                let valid=true;
                signupSuccess="You are successfully signed up"
                res.send(valid)
          }else{
              let valid=false;
              res.send(valid);
          }
          })
        }
      })
  
});
// ====================================otpsignup============================

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


//============================================cart routes======================================
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

//=========================================== wishlist ==================================

router.get("/wishlist", verifylogin, async (req, res) => {
  let products=await userHelpers.getWishProducts(req.session.user._id)
  // console.log(products);
  // let totalValue=await userHelpers.getTotalAmount(req.session.user._id)

 if(products){
  
  res.render("user/wishlist",{products,'user':req.session.user});

  }
  else{
    res.render("user/wishlistEmpty",{'user':req.session.user})
  }
});

router.get('/add-to-wishlist/:id',verifylogin,(req,res)=>{
  userHelpers.addToWishlist(req.params.id,req.session.user._id).then(()=>{
    res.redirect("/")

  })


})
 




//=============================================== wishlist============================




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

//=======================================otp verfication====================================

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

//======================================category view=========================================
router.get('/category-view/:id',(req,res)=>{
  let category=req.params.id
  userHelpers. categoryView(category).then((products)=>{
  console.log(products);
  res.render('user/view-category',{products,user:req.session.user})
  
  })

})

// =========================================quantity==========================================
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

// =================================removeWishlist==================
router.post('/remove-product-wishlist',(req,res)=>{
  userHelpers.removeWishProduct(req.body).then((response)=>{
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

userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
  console.log(orderId);
  if(req.body['payment-method']==='COD'){

    res.json  ({codSuccess:true})

  }else {

    userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
      res.json(response)

    })

  }
  

});

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
// router.get('/view-order-products/:id',async(req,res)=>{
//   var imgId = req.params.id;
//   let product = await userHelpers.imageDetails(req.params.id);
//   // let product=await userHelpers.getOrderProducts(req.params.id)
//    res.render('user/view-order-products',{product})
//   // res.render("user/view-image",{product});
// })
// ------------view-orders from order--------
// router.get('/view-order-products/:id',async(req,res)=>{
//   var imgId = req.params.id;
//   // let product = await userHelpers.imageDetails(req.params.id);
//    let products=await userHelpers.getOrderProducts(req.params.id)
//    res.render('user/view-order-products',{products,user:req.session.user})
//   // res.render("user/view-image",{product});
// })









router.get('/arun',async(req,res)=>{
  // let category=req.params.id
  // userHelpers. categoryView(category).then((products)=>{
  // console.log(products);
  res.render("user/single-product")
  })
  
// ============================my profile=======================
router.get("/myprofile",async(req,res)=>{
  let profile=await userHelpers.getMydetals(req.session.user?._id)
  
  res.render("user/myprofile",{profile,user:req.session.user})

});

// ==================================add details======================

router.get("/add-details",verifylogin,async(req,res)=>{
  let details = await userHelpers.addToProfile(req.session.user._id)
  res.render("user/profile-Details")

  
});

// ========================add profile post================


// router.post("/add-details", (req, res) => {
//   console.log("call is here");
//   userHelpers.addToProfile(req.body, (id) => {
   
//     let image = req.files.image;
//     if (
//         image.mv("./public/profile-image/" + id + ".jpg"),
//       (err, done) => {
//         if (!err) {
//           res.render("user/myprofile", { admin: true });
//         } else {
//           console.log(err);
//         }
//       })
    
//       res.render("user/myprofile");
//   });
// });









router.post("/profilepic",verifylogin,async(req,res)=>{
  
id=await req.session.user._id;
  
  
  let image = req.files.image;
image.mv("./public/profile-image/" + id + ".jpg")
    
      res.redirect("/myprofile");
   
 

})

// ========================================changepassword====================================


router.post("/changepassword",verifylogin,(req,res)=>{


  userHelpers.changePassword(req.body).then((response)=>{

console.log("Password Succesfully changed");


  })
  if(response.status){
   
          res.redirect("/myprofile")
          
        }else{
          alert("Password not changed")
        }
 


})

// =====================================changeEmail======================

router.post("/changeEmail",verifylogin,(req,res)=>{
  userHelpers.changeEmail(req.body).then(async()=>{
    let profile=await userHelpers.getMydetals(req.session.user?._id)
  
  // let profile=await userHelpers.getMydetals(req.session.user?._id)
  
  res.render("user/myprofile",{profile,user:req.session.user})
  // res.render("user/myprofile")
  })

})


router.post('/verify-payment',(req,res)=>{
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log("payment successfull");
      res.json({status:true})
    })
  }).catch((err)=>{
    console.log(err);
    res.json({status:false,errMsg:''})
  })
})
// ========================changephone=========================

router.post("/changePhone",verifylogin,(req,res)=>{
  userSignup=req.body;
  console.log(userSignup);
  phone=req.body.phone;
  console.log(phone);
  client.verify
    .services(serviceSsid)
    .verifications.create({ to: `+91${phone}`, channel: "sms" })
    .then((resp) => {
      console.log(resp);
      res.render("user/phoneOtp", { phone });
    });
 
    
    
    
 
  // res.render("user/myprofile")
  

})

// ======================================phoneOtp==================
router.get('/phoneOtp',(req,res)=>{
  console.log(req.body+"arunms");
  res.header(
    "Cache-Control",
    "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
  );
  let phoneNumber=req.query.phonenumber;
  let otpNumber=req.query.otpnumber;
  console.log(phoneNumber);
  console.log(otpNumber);

  client.verify
        .services(serviceSsid)
        .verificationChecks.create({
        to: "+91"+phoneNumber,
        code:otpNumber,
      }).then((resp)=>{
        console.log("tttt",resp);
        if(resp.valid){
          userHelpers.changePhone(userSignup).then((response)=>{
            console.log("haaa",response);
            if(response){
              console.log("acknoledgedtrue");
                let valid=true;
                signupSuccess="You are successfully signed up"
                res.send(valid)
          }else{
              let valid=false;
              res.send(valid);
          }
          })
        }
      });
  
});

router.get('/view-order-products/:id',verifylogin,async(req,res)=>{
 
  let products= await userHelpers.getOrderProductDetails(req.params.id)
  let user=req.session.user
  res.render('user/view-order-products',{products,user})
})





module.exports = router;
