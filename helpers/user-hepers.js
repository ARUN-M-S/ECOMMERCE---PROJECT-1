var db = require("../confiq/connection");
var collection = require("../confiq/collection");
var bcrypt = require("bcrypt");
var objectId = require("mongodb").ObjectId;
var promise = require("promise");
const async = require("hbs/lib/async");
const { resolve, reject } = require("promise");
const { response } = require("express");
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
      console.log(user.email);
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
      let status = order["payment-method"] == "COD" ? "placed" : "pending";
      let orderObj = {
        deliveryDetails: {
          mobile: order.phoneNumber,
          address: order.address,
          pincode: order.pincode,
          state: order.state,
          city: order.city,
        },
        userId: objectId(order.userId),
        paymentMethode: order["payment-method"],
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
          resolve();
        });
    });
  },
  getCartProductList: (userId) => {
    return new promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      resolve(cart?.products);
    });
  },
  getUserOrders: (userId) => {
    return new promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: objectId(userId) })
        .toArray();
      console.log(orders);
      resolve(orders);
    });
  },
  getOrderProducts: (orderId) => {
    return new promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
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
    return new Promise(async (resolve, reject) => {
      let userWishlist = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .findOne({ user: objectId(userId) });

      if (userWishlist) {
        db.get()
          .collection(collection.WISHLIST_COLLECTION)
          .updateOne(
            { user: objectId(userId) },
            {
              $push: { products: objectId(proId)},
            }
          )
          .then((response) => {
            resolve();
          });
      } else {
        let wishObj = {
          user: objectId(userId),
          products: [objectId(proId)],
        };
        db.get()
          .collection(collection.WISHLIST_COLLECTION)
          .insertOne(wishObj)
          .then((response) => {
            resolve();
          });
      }
    });
  },
  getWishProducts:(userId)=>{
      return new Promise(async(resolve,reject)=>{
          let wishProducts = await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
              {
                  $match:{user:objectId(userId)}
              },
              {
                  $lookup:{
                      from:collection.PRODUCT_COLLECTION,
                      let:{wishList:'$products'},
                      pipeline:[ 
                          { 
                              $match:{
                                  $expr:{
                                       $in:['$_id',"$$wishList"]
                                  }

                              }

                          }
                      ],
                      as:'wishProducts'
                      
                  }
              }
          ]).toArray()
          resolve(wishProducts[0].wishProducts)
           
      })
  }
};
  