let db = require("../confiq/connection");
let collection = require("../confiq/collection");
let bcrypt = require("bcrypt");
var objectId = require("mongodb").ObjectId;
var promise = require("promise");
const async = require("hbs/lib/async");
const { resolve, reject } = require("promise");
const { response } = require("express");
const Razorpay = require("razorpay");
var instance = new Razorpay({
  key_id: "rzp_test_aScLPZGnWnxvJB",
  key_secret: "lcaGOMaRalCTNEtBsNtQBGVj",
});
module.exports = {
  doSignup: (userData) => {
    console.log(userData.phoneNumber);
    return new promise(async (resolve, request) => {
      userData.password = await bcrypt.hash(userData.password, 10);
      db.get()
        .collection(collection.USER_COLLECTION)
        .insertOne(userData)
        .then((data) => {
          resolve(data);
        });
    });
  },
  doLogin: (userData) => {
    console.log(userData);
    return new promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email });

      if (!user?.userBlock) {
        if (user) {
          bcrypt.compare(userData.password, user.password).then((status) => {
            if (status) {
              console.log("login success");
              response.user = user;
              response.status = true;
              resolve(response);
            } else {
              console.log("login failed");
              resolve({ status: false });
            }
          });
        } else {
          resolve({ status: false });
          console.log("failed");
        }
      } else {
        resolve(user);
      }
    });
  },
  imageDetails: (id) => {
    console.log(id);
    return new promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(id) })
        .then((response) => {
          resolve(response);
        });
    });
  },
  checkPhone: (phone) => {
    console.log(phone);
    return new promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ phoneNumber: phone })
        .then((resp) => {
          console.log("hi" + resp);
          resolve(resp);
        });
    });
  },
  doLoginOtp: (phone) => {
    return new promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ phoneNumber: phone });

      resolve(user);
    });
  },
  emailCheck: (email, phone) => {
    return new promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ $or: [{ email: email }, { phoneNumber: phone }] });
      console.log(user);
      resolve(user);
    });
  },
  categoryView: (categoryview) => {
    return new promise(async (resolve, reject) => {
      let product = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ category: categoryview })
        .toArray();
      resolve(product);
    });
  },
  addToCart: (proId, userId) => {
    console.log(proId);
    console.log(userId);
    let proObj = {
      item: objectId(proId),
      quantity: 1,
    };
    return new promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      console.log(userCart);
      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item == proId
        );
        console.log("houiihg");
        console.log(proExist);
        if (proExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId), "products.item": objectId(proId) },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId) },
              {
                $push: { products: proObj },
              }
            )
            .then((response) => {
              resolve();
            });
        }
      } else {
        let cartObj = {
          user: objectId(userId),
          products: [proObj],
        };
        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then((response) => {
            resolve(response);
          });
      }
    });
  },
  getCartProducts: (userId) => {
    console.log(userId);
    return new promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();

      resolve(cartItems);
    });
  },
  getCarCount: (userId) => {
    let count = 0;
    return new promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (cart) {
        count = cart.products.length;
        console.log(count);
      }
      resolve(count);
    });
  },
  changeProductQuantity: (details) => {
    details.count = parseInt(details.count);
    details.quantity = parseInt(details.quantity);

    return new promise((resolve, reject) => {
      if (details.count == -1 && details.quantity == 1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: objectId(details.cart) },
            {
              $pull: { products: { item: objectId(details.product) } },
            }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          });
      } else {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: objectId(details.cart),
              "products.item": objectId(details.product),
            },
            {
              $inc: { "products.$.quantity": details.count },
            }
          )
          .then(() => {
            resolve({ status: true });
          });
      }
    });
  },
  removeCartProduct: (details) => {
    return new promise((resolve, reject) => {
      console.log("detaid");
      console.log(details);
      console.log(objectId(details.cart));
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { _id: objectId(details.cart) },
          {
            $pull: { products: { item: objectId(details.product) } },
          }
        )
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },
  getTotalAmount: (userId) => {
    return new promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$quantity", { $toInt: "$product.offerPrice" }],
                },
              },
            },
          },
        ])
        .toArray();

      resolve(total[0]?.total);
    });
  },
  placeOrder: (order, products, total) => {
    return new promise((resolve, reject) => {
      console.log(order, products, total);
      let status = order["payment-method"] === "COD" ? "placed" : "pending";
      let orderObj = {
        deliveryDetails: {
          date: new Date(),
          name: order.name,
          houseNumber: order.house,
          mobile: order.phoneNumber,
          address: order.address,
          pincode: order.pincode,
          state: order.state,
          city: order.city,
        },
        userId: objectId(order.userId),
        paymentMethod: order["payment-method"],
        products: products,
        totalAmount: total,
        status: status,
        Date: new Date(),
      };
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection(collection.CART_COLLECTION)
            .deleteOne({ user: objectId(order.userId) });
          resolve(response.insertedId);
        });
    });
  },
  getUserOrders: (userId) => {
    return new promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: objectId(userId) })
        .sort({ Date: -1 })
        .toArray();
      console.log(orders);
      resolve(orders);
    });
  },
  getOrderProducts: (orderId) => {
    return new promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { _id: objectId(orderId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      console.log(cartItems);

      resolve(cartItems);
    });
  },
  addToWishlist: (proId, userId) => {
    let wishObj = {
      item: objectId(proId),
      quantity: 1,
    };
    return new promise(async (resolve, reject) => {
      let userWishlist = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .findOne({ user: objectId(userId) });
      console.log(userWishlist);

      if (userWishlist) {
        let proExist = userWishlist.products.findIndex(
          (wishProducts) => wishProducts.item == proId
        );

        if (proExist != -1) {
          db.get()
            .collection(collection.WISHLIST_COLLECTION)
            .updateOne(
              { user: objectId(userId), "products.item": objectId(proId) },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collection.WISHLIST_COLLECTION)
            .updateOne(
              { user: objectId(userId) },

              {
                $push: { products: wishObj },
              }
            )
            .then((response) => {
              resolve();
            });
        }
      } else {
        let wishObjects = {
          user: objectId(userId),
          products: [wishObj],
        };
        db.get()
          .collection(collection.WISHLIST_COLLECTION)
          .insertOne(wishObjects)
          .then((response) => {
            resolve(response);
          });
      }
    });
  },
  getWishProducts: (userId) => {
    console.log(userId);
    return new promise(async (resolve, reject) => {
      let wishItems = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "userWishlist",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              userWishlist: { $arrayElemAt: ["$userWishlist", 0] },
            },
          },
        ])
        .toArray();
      console.log(wishItems, "wishItemsishere");

      resolve(wishItems);
    });
  },
  getrelatedproducts: (relatedpro) => {
    return new promise(async (resolve, reject) => {
      let relpro = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ category: relatedpro })
        .toArray();
      resolve(relpro);
    });
  },
  getMydetals: (userId) => {
    // console.log(userId);
    return new promise(async (resolve, reject) => {
      let profile = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userId) });
      // console.log(profile);
      resolve(profile);
    });
  },

  //   addToProfile:(product,callback)=>{
  //     console.log(product);
  //     db.get().collection('product').insertOne(product).then((data)=>{
  //         console.log(data);
  //      callback(data.insertedId)
  //     })

  // },

  addToProfile: (proId, userId) => {
    return new Promise(async (resolve, reject) => {
      let profile = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userId) });
      console.log(profile);
      let userDetails = await db
        .get()
        .collection(collection.PROFILE_COLLECTION)
        .findOne({ profile: objectId(userId) });
      console.log(userDetails);

      if (!userDetails) {
        let profile = {
          user: objectId(userId),
          details: [objectId(proId)],
        };
        db.get()
          .collection(collection.PROFILE_COLLECTION)
          .insertOne(profile)
          .then((response) => {
            resolve(profile);
          });
      } else {
        console.log("user is here");
        resolve();
      }
    });
  },
  // getWishProducts:(userId)=>{
  //     return new promise(async(resolve,reject)=>{

  //         let wishProducts = await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
  //             {
  //                 $match:{user:objectId(userId)}
  //             },
  //             {
  //                 $lookup:{
  //                     from:collection.PRODUCT_COLLECTION,
  //                     let:{wishList:'$products'},
  //                     pipeline:[
  //                         {
  //                             $match:{
  //                                 $expr:{
  //                                      $in:['$_id',"$$wishList"]
  //                                 }

  //                             }

  //                         }
  //                     ],
  //                     as:'wishProducts'

  //                 }
  //             }
  //         ]).toArray()
  //         if(wishProducts){
  //           console.log("praveeeeeeeeeeeeen");
  //         resolve(wishProducts[0].wishProducts)}
  //         else{
  //           console.log("not here");
  //           resolve()
  //         }

  //     })
  // },

  addprofile: (userId) => {
    return new promise(async (resolve, reject) => {
      let id = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find({ _id: objectId(userId) });
      console.log(id);
    });
  },
  // doLogin: (userData) => {
  //   console.log(userData);
  //   return new promise(async (resolve, reject) => {
  //     let loginStatus = false;
  //     let response = {};
  //     let user = await db
  //       .get()
  //       .collection(collection.USER_COLLECTION)
  //       .findOne({ email: userData.email });

  //     if (!user?.userBlock) {
  //       if (user) {
  //         bcrypt.compare(userData.password, user.password).then((status) => {
  //           if (status) {
  //             console.log("login success");
  //             response.user = user;
  //             response.status = true;
  //             resolve(response);
  //           } else {
  //             console.log("login failed");
  //             resolve({ status: false });
  //           }
  //         });
  //       } else {
  //         resolve({ status: false });
  //         console.log("failed");
  //       }
  //     } else {
  //       resolve(user);
  //     }
  //   });
  // },

  changePassword: (userData) => {
    console.log(userData);
    return new promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userData.userId) });

      if (user) {
        bcrypt
          .compare(userData.password, user.password)
          .then(async (status) => {
            if (status) {
              userData.newPassword = await bcrypt.hash(
                userData.newPassword,
                10
              );
              console.log("password matched");
              db.get()
                .collection(collection.USER_COLLECTION)
                .updateOne(
                  { _id: objectId(userData.userId) },
                  {
                    $set: {
                      password: userData.newPassword,
                    },
                  }
                )
                .then((response) => {
                  if (response) {
                    resolve({ status: true });
                  }
                });
            }
          });
      }
    });
  },
  changeEmail: (userData) => {
    return new promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userData.userId) });

      if (user) {
        bcrypt
          .compare(userData.password, user.password)
          .then(async (status) => {
            if (status) {
              console.log("password matched for emailchange");
              db.get()
                .collection(collection.USER_COLLECTION)
                .updateOne(
                  { _id: objectId(userData.userId) },
                  {
                    $set: {
                      email: userData.email,
                    },
                  }
                )
                .then((response) => {
                  if (response) {
                    resolve({ status: true });
                  }
                });
            }
          });
      }
    });
  },
  //generate razorpay

  generateRazorpay: (orderId, total) => {
    console.log("this is order", orderId);

    return new Promise((resolve, reject) => {
      var options = {
        amount: total * 100,
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, function (err, order) {
        if (err) {
          console.log(err);
        } else {
          console.log("New Order ", order);
          resolve(order);
        }
      });
    });
  },

  verifyPayment: (details) => {
    console.log(details);
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", "lcaGOMaRalCTNEtBsNtQBGVj");

      hmac.update(
        details["payment[razorpay_order_id]"] +
          "|" +
          details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");
      console.log(hmac);
      if (hmac == details["payment[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    });
  },

  changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              status: "placed",
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  // =========================online============

  getCartProductList: (userId) => {
    return new promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      resolve(cart.products);
    });
  },

  // ===============================offer price=====================================
  // offerPrice: (userId) => {
  //   return new promise(async (resolve, reject) => {
  //     let total = await db
  //       .get()
  //       .collection(collection.PRODUCT_COLLECTION)
  //       .aggregate([
  //         {
  //           $match: { user: objectId(userId) },
  //         },
  //         {
  //           $unwind: "$products",
  //         },
  //         {
  //           $project: {
  //             item: "$products.item",
  //             quantity: "$products.quantity",
  //           },
  //         },
  //         {
  //           $lookup: {
  //             from: collection.PRODUCT_COLLECTION,
  //             localField: "item",
  //             foreignField: "_id",
  //             as: "product",
  //           },
  //         },
  //         {
  //           $project: {
  //             item: 1,
  //             quantity: 1,
  //             product: { $arrayElemAt: ["$product", 0] },
  //           },
  //         },
  //         {
  //           $group: {
  //             _id: null,
  //             total: {
  //               $sum: {
  //                 $multiply: ["$quantity", { $toInt: "$product.offerPrice" }],
  //               },
  //             },
  //           },
  //         },
  //       ])
  //       .toArray();

  //     resolve(total[0]?.total);
  //   });
  // },

  // ======================================change otp=========================

  changePhone: (userData) => {
    return new promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userData.userId) });

      if (user) {
        bcrypt
          .compare(userData.password, user.password)
          .then(async (status) => {
            if (status) {
              console.log("password matched for PhoneNumber Change");
              db.get()
                .collection(collection.USER_COLLECTION)
                .updateOne(
                  { _id: objectId(userData.userId) },
                  {
                    $set: {
                      phoneNumber: userData.newphone,
                    },
                  }
                )
                .then((response) => {
                  if (response) {
                    resolve({ status: true });
                  }
                });
            }
          });
      }
    });
  },

  // ========================getOrderProductDetails=====================
  getOrderProductDetails: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderItems = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { _id: objectId(orderId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();

      console.log("oo", orderItems);
      resolve(orderItems);
    });
  },
  getTotalAmount: (userId) => {
    return new promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$quantity", { $toInt: "$product.offerPrice" }],
                },
              },
            },
          },
        ])
        .toArray();

      resolve(total[0]?.total);
    });
  },

  // =========================Remove Wishproduct====================
  removeWishProduct: (details) => {
    return new promise((resolve, reject) => {
      console.log("detaidddddddddddddddddddddddddd");
      console.log(details);
      console.log(objectId(details.cart));
      db.get()
        .collection(collection.WISHLIST_COLLECTION)
        .updateOne(
          { _id: objectId(details.cart) },
          {
            $pull: { products: { item: objectId(details.product) } },
          }
        )
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },


// ==============================Saving Address to the collection============

userAddress:(userdata,userId)=>{
  console.log(userdata);
  let address={
    Useraddress:new objectId(),
    name:userdata.name,
    phoneNumber:userdata.phoneNumber,
    state:userdata.state,
    pincode:userdata.pincode,
    house:userdata.house,
    city:userdata.city,
    address:userdata.address,
    
}
  return new promise((resolve,reject)=>{
     db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},{
       $push:{Address:address}
     }).then((response)=>{
       console.log(response,"address");
       resolve(response)
     })
    resolve()
    
  })
},

// ============================get Address for order==============
getAddress:(userId)=>{
  return new promise(async (resolve, reject) => {
      let address = await db.get().collection(collection.USER_COLLECTION).aggregate([
          {
              $match: { _id: objectId(userId) }
          },
          {
              $unwind: '$Address'
          },
        
      ]).toArray();
      console.log("lllllllllllllllllllllllllllllllll");
      console.log(address);
      resolve(address);
  });
},
EditAddress:(userId,addId)=>{
  return new promise(async(resolve,reject)=>{
      let address=await db.get().collection(collection.USER_COLLECTION).aggregate([
          {
              $match:{_id:objectId(userId)}
          },
          {
              $unwind:'$Address'
          },
          {  
              $match:{'Address.Useraddress':objectId(addId)}                  
          }
                 
        
      ]).toArray()
      console.log("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
      console.log(address);
      resolve(address)
  })
  
},
updateAddress:(userId,addressId,data)=>{
  console.log(userId)
  console.log(addressId)
  console.log(data);
  return new promise(async(resolve,reject)=>{
  
     await db.get().collection(collection.USER_COLLECTION).updateOne({
          _id:objectId(userId),
          "Address.Useraddress":objectId(addressId)},
      {$set:{
          "Address.$.name":data.name,
          "Address.$.phoneNumber":data.phoneNumber,
          "Address.$.state":data.state,
          "Address.$.pincode":data.pincode,
          "Address.$.house":data.house,
          "Address.$.city":data.city,
          "Address.$.home":data.location,
          "Address.$.address":data.address
          
      }
      }
      ).then((resp)=>{
          console.log(resp)
          resolve(resp)
      })

  })
},
deleteAddress:(userID,addId)=>{
  return new promise(async(resolve,reject)=>{
     await db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userID)},
      {
          $pull:{Address:{Useraddress:objectId(addId)}}
      }
      )

.then((resp)=>{
      console.log(resp)
      resolve(resp)
  })
})

},
};