const { response } = require("express");
let express = require("express");
const async = require("hbs/lib/async");
const { Db } = require("mongodb");
const { getOrderProductDetails } = require("../helpers/product-helpers");
var router = express.Router();
const productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-hepers");
const swal = require( 'sweetalert');
const paypal= require('paypal-rest-sdk');
paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': 'AUNC-SkKejcJ-JmppdiGiRJrtSnFsAL0-CykIfuVStKUZ0FhLXNwG8ThDeYhmWlYA80z-3md3bQUYd-J',
  'client_secret': 'EL2Sspxfmlobh9pos-p0zMS_p71nEtVt5mJS9uqvi8KSZn69uUtMYm0_7_MNTWaDc3rqbxbf3SPboq_j'
});


const serviceSsid = "VA5440c48ff0e92ed96faf250b9359ce15";
const AccountSsid = "ACf10e011f8facf58eeae5bd2139c0be95";
const token = "170df357d9d157cf3aa45e231e21e4d6";
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
  req.session.finalAmount=0
  cartCount=null
  if (req.session.user) {
    var cartCount=await userHelpers.getCarCount(req.session.user._id)
  }
  
  productHelpers.getAllproducts().then((products) => {
    productHelpers.getAllcategory().then((category) => {
      productHelpers.getAllcarousel().then((carousel) => {
        productHelpers.getOfferproducts().then((offer)=>{
      
       
      //  let ok = offerprice
      //  console.log(ok);
      res.render("user/view-products", { products, user, category ,cartCount,carousel,offer});
    });})
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
  req.session.total=totalValue
  let finalAmount= req.session.total

  cartCount=null
  if (req.session.user) {
    var cartCount=await userHelpers.getCarCount(req.session.user._id)
  }
  if(cartCount){
  res.render("user/cart",{products,'user':req.session.user,cartCount,finalAmount});


  }else{
    res.render("user/emptycart",{'user':req.session.user})
  }
  
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
router.get('/category-view/:id',async(req,res)=>{
  
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
  let total;
   price=await userHelpers.getTotalAmount(req.session.user._id)
    let Address= await userHelpers.getAddress(req.session.user._id)
    // req.session.finalAmount=price;
    if(req.session.finalAmount){
       total= req.session.finalAmount;
    }else{
 total=price;
    }
    
    console.log(Address,"pravenn sajeev");
  
//  res.render('user/add',{Address})
  
   res.render('user/Add-address',{total,user:req.session.user,Address})
})
router.post('/place-order',async(req,res)=>{
  let userId= req.session.user._id
  console.log(req.body,"myordersssssssssssssssss");
  let address= await userHelpers.EditAddress(req.body,userId)

  let products=await userHelpers.getCartProductList(userId)
  let totalPrice=await userHelpers.getTotalAmount(userId)
  if(req.session.finalAmount){
    totalPrice=parseInt(req.session.finalAmount);
  }
  console.log(totalPrice,"amountttttt");
  console.log(address,"amountttttt");

  
  
  let orderAddress=address[0].Address



userHelpers.placeOrder(orderAddress,products,totalPrice,req.body,userId).then((orderId)=>{
  console.log(orderId);
  if(req.body['payment-method']==='COD'){

    res.json  ({codSuccess:true})

  }
  
  
  else if(req.body['payment-method']==='ONLINE') {

    userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
      res.json(response)

    })

  }else if (req.body['payment-method'] === "PAYPAL") {
    console.log("entered to paypal");
    val = totalPrice / 74;
    totalPrice = val.toFixed(2);
    let totals = totalPrice.toString();
    req.session.total = totals;
    var create_payment_json = {
      "intent": "sale",
      "payer": {
        "payment_method": "paypal"
      },
      "redirect_urls": {
        "return_url": "http://localhost:3000/order-success",
        "cancel_url": "http://localhost:3000/cancel"
      },
      "transactions": [{
        "item_list": {
          "items": [{
            "name": "item",
            "sku": "001",
            "price": totals,
            "currency": "USD",
            "quantity": 1
          }]
        },
        "amount": {
          "currency": "USD",
          "total": totals
        },
        "description": "This is the payment description."
      }]
    };
    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
        throw error;
      }
      else {
        console.log("Create Payment Response");
        console.log(payment);
        for (var i = 0; i < payment.links.length; i++) {
          console.log("1111")
          if (payment.links[i].rel === "approval_url") {
            console.log("2222")
            let link = payment.links[i].href;
            link = link.toString()
            // console.log(paypalAmt)
            // console.log(typeof paypalAmt)
            res.json({ paypal: true, url: link })
            // else{
            //   console.log("paypal");
            //   userHelpers.generatePaypal(orderId,totalPrice).then((response)=>{

            //   })
            // }

          }
        }
      }
    })
  }
  router.get('/success', (req, res) => {
    if (req.session.user.loggedIn) {
      let paypalAmt = req.session.total
      paypalAmt = paypalAmt.toString()
      console.log(req.query)
      const payerId = req.query.PayerID
      const paymentId = req.query.paymentId
      var execute_payment_json = {
        "payer_id": payerId,
        "transactions": [{
          "amount": {
            "currency": "USD",
            "total": paypalAmt
          }
        }]
      }
      paypal.payment.execute(paymentId, execute_payment_json, function (error,
        payment) {
        if (error) {
          console.log(error.response);
          throw error;
        } else {
          console.log("Get Payment Response");
          console.log(JSON.stringify(payment));
          userHelpers.changePaymentStatus(req.session.orderId).then(() => {
            res.render('user/order-success')
          })
        }
      });
    }
    else {
      res.render('user/login')
    }
  })
  

});

router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})
  console.log(req.body);
})


router.get('/orders',verifylogin,async(req,res)=>{
  // console.log(req.session.user?._id);
  
  let orders=await userHelpers.getUserOrders(req.session.user?._id)
  // console.log(orders,"praveeeeennnnnnnnnnnagdgsgsg");
// res.render('user/orders',{user:req.session.user,orders})
res.render('user/ordersssss',{user:req.session.user,orders})

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

// ==========================for adding new address for user ===================
router.get('/arunms',verifylogin,(req,res)=>{
  res.render("user/add-addressuser")
})
router.post("/useradd",verifylogin,(req,res)=>{
  let userId=req.session.user._id
  console.log(userId);
userHelpers.userAddress(req.body,userId).then((responce)=>{
  console.log(responce);
  res.redirect("/place-order")

})

});
// =========================fromprofile============================
router.post("/useraddress",verifylogin,(req,res)=>{
  let userId=req.session.user._id
  console.log(userId);
userHelpers.userAddress(req.body,userId).then((responce)=>{
  console.log(responce);
  res.redirect("/myprofile")

})

});
// =======================Address showing for user from profile======

router.get('/myaddress',verifylogin,async(req,res)=>{
  let Address=await userHelpers.getAddress(req.session.user._id)
 
  
  let user=req.session.user
  
  if(Address[0]?.Address){
  res.render("user/myAddres",{Address,user})


  }
  else{
    res.render("user/add-addressuser")
  }

})

router.post('/editcurrentAddress/:id',verifylogin,async(req,res)=>{
  let addId=req.params.id;
  let userId=req.session.user._id
  let body=req.body
  console.log(body,"akhillllllll");
  
   let Address = await userHelpers.updateAddress(userId,addId,body);
   res.redirect("/myaddress")
  
})
// ============================forgraph==============




// ========================for total sales===================
// router.get("/totalOrder",async(req,res)=>{
//   // let amount = await productHelpers. getWeeklyIncome();
//   let Amounts= await productHelpers.getToatlIncome();
//   console.log(Amounts);
 


// });
// =====================weeklysales=======================
// router.get("/totalWeeklyOrder",async(req,res)=>{
//   // let amount = await productHelpers. getWeeklyIncome();
//   let Amounts= await productHelpers.getWeeklyTotal();
//   console.log(Amounts);
 


// });
// router.get("/yearlysales",async(req,res)=>{
//   // let amount = await productHelpers. getWeeklyIncome();
//   let Amounts= await productHelpers.getYearlyTotal();
//   console.log(Amounts);
 


// });
// router.get("/montlyTotal",async(req,res)=>{
//   // let amount = await productHelpers. getWeeklyIncome();
//   let Amounts= await productHelpers. getMontlyTotal();
//   console.log(Amounts);
 


// });

  
router.post('/coupenAdding',verifylogin,async(req,res)=>{
  let coupon=req.body.coupon;
  let total= req.session.total
  // console.log(total,"shyam");
  // console.log(coupon,"akhilasif");
  let validateCoupon= await  userHelpers.validateCoupon(coupon);
  if(validateCoupon){
    let userId=req.session.user._id
    let couponCode = validateCoupon.code;
    let couponoffer = validateCoupon.offer;
  

    
 let validateUser=await userHelpers.addusertoCoupon(userId,couponCode);
 
 if(validateUser){
  res.json({user:true})
 }else{
   discount=total-(total*(couponoffer))/100
   req.session.finalAmount=discount
  res.json({discount})
   
 }
  }else{
    res.json({coupon:true})
  }
  
 
  
})

// ============================coupon Expiry=====================
router.get('/couponTime',verifylogin,async(req,res)=>{
  // console.log("coupon on user.js");
  await productHelpers.couponExpiry();


})
router.get('/deleteadd/:id',verifylogin,async(req,res)=>{
  let id = req.params.id;
  let userId=req.session.user._id
  // console.log(userId,"arunmsudevan",id);
  userHelpers.deleteAddress(userId,id).then((responce)=>{
    res.redirect("/myaddress")
  })
 
});
router.get('/cancel-order/:id',async(req,res)=>{
  console.log("praveen is here");
  orderId=req.params.id
  console.log(orderId,"ishres");
  // console.log(id,"rohitttt");
  productHelpers.cancelOrder(orderId).then((responce)=>{
    res.json(responce)
  })
})

// router.post("/statusUpdate", (req, res) => {
//   let status = req.body.status;
//   let orderId = req.body.orderId;
//   console.log("hiii", status);
//   console.log("hloo", orderId);

//   productHelpers.statusUpdate(status, orderId).then((response) => {
    
//   });
// });
router.get("/newproduct",(req,res)=>{
  res.render("user/new-product-page")
})

module.exports = router;
