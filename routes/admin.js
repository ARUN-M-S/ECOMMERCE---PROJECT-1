const { response } = require('express');
var express = require('express');
const async = require('hbs/lib/async');

const productHelpers = require('../helpers/product-helpers');
var router = express.Router();
var productHelper=require('../helpers/product-helpers')

/* GET users listing. */

const cridential={
  email:"asifsaheer7034@gmail.com",
  password:1234
}



const verifylogin=(req,res,next)=>{
  if(req.session.admin){
    next()
  }else{
    res.render('admin/admin-login',{login:false,admin:true})
  }
}

router.post('/admin-login',(req,res)=>{
  if(req.body.email==cridential.email && req.body.password==cridential.password){
  
    req.session.admin=true
  
    res.redirect('/admin')
  }else{
    res.render('admin/admin-login',{loginadminErr:true})
  }
  loginadminErr=false
  
})

router.get('/admin-logout',verifylogin,(req,res)=>{
  req.session.admin=false
   res.redirect('/admin')
})


router.get('/',verifylogin,function(req, res, next) {
  
  res.render('admin/admin-home',{home:true})

});
router.get('/products',verifylogin,(req,res)=>{
  productHelpers.getAllproducts().then((products)=>{
  res.render('admin/view-products',{products,admin:true})
  })
})
router.get('/add-product',verifylogin,(req,res)=>{
  res.render('admin/add-product',{admin:true})
})
router.post('/add-product',(req,res)=>{
  productHelper.addproduct(req.body,(id)=>{
    let images =req.files.images
    let image=req.files.image
    if(  image.mv('./public/product-images/'+id+'.jpg') && images.mv('./public/product-images1/'+id+'.jpg'),(err,done)=>{
      if(!err){
        res.render("admin/add-product",{admin:true})
      }else{
        console.log(err);
      }
    })
    res.render("admin/add-product")
  })
 
})

  

router.get('/edit-product/:id',verifylogin,async(req,res)=>{
  let product=await productHelper.getAllproductsDetails(req.params.id)
  console.log(product);
  res.render('admin/edit-product',{product,admin:true})
})
router.post('/edit-product/:id',(req,res)=>{
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    let id=req.params.id
    res.redirect('/admin/')
    if(req.files.image && req.files.images){
      let images =req.files.images
      let image=req.files.image
      
      image.mv('./public/product-images/'+id+'.jpg',(err,done)=>{
       
      })
      images.mv('./public/product-images1/'+id+'.jpg',(err,done)=>{
       
      })

    }
  })
})
router.get('/delete-product/:id',verifylogin,(req,res)=>{
  let proId=req.params.id
  console.log(proId);
  
  productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin/products')
  })

})
router.get('/view-category',verifylogin,(req,res)=>{

  productHelper.getAllcategory().then((category)=>{
    console.log(category);
    res.render('admin/view-category',{category,admin:true})
  })


})
router.get('/add-category',verifylogin,(req,res)=>{
  res.render('admin/add-category',{admin:true})

})
router.post('/add-category',(req,res)=>{
  productHelper.addcategory(req.body).then((id)=>{
    let categoryImage=req.files.image
    categoryImage.mv('./public/category-image/'+id+'.jpg',(err,done)=>{
      if(err){
  console.log(err);
      }else{
        res.render('admin/add-category',{admin:true})
      }
    })
    res.render('admin/add-category')

  })
   
})
router.get('/delete-category/:id',verifylogin,(req,res)=>{
  let cateId=req.params.id
  console.log(cateId);
  productHelper.deleteCategory(cateId).then((response)=>{
    res.redirect('/admin/view-category')
  })

})

router.get('/edit-category/:id',verifylogin,async(req,res)=>{
  let category= await productHelper.getAllcategoryDetails(req.params.id)
    res.render('admin/edit-category',{category,admin:true})
  })

router.post('/edit-category/:id',(req,res)=>{
  productHelper.updateCategory(req.params.id,req.body).then((response)=>{
    console.log(response);
    let id=req.params.id
    let images=req.files.image
    if(req.files.image){
      images.mv('./public/category-image/'+id+'.jpg',(err,done)=>{
      })
    }
    res.redirect('/admin/view-category') 
   
  })

})
router.get('/all-users',(req,res)=>{
  productHelper.getAllUsers().then((users)=>{
    res.render('admin/all-users',{users,admin:true})
  })

})

//admin

router.get('/block-user/:id',(req,res)=>{
  let id= req.params.id
  console.log(id);
  req.session.destroy()
 productHelpers.blockUsers(id).then((resp)=>{
   if(resp){
     res.redirect('/admin/all-users')
   }else{
     console.log('failed');
   }
 })
 })
 router.get('/unblock-user/:id',(req,res)=>{
   const id=req.params.id
    productHelper.unblockUser(id).then((resp)=>{
      if(resp){
        res.redirect('/admin/all-users')
        console.log(resp);
      }else{
        console.log("failed");
      }
    })
 })
 router.get('/delete-users/:id',(req,res)=>{
   let id=req.params.id
   productHelper.deleteUsers(id).then((response)=>{
    res.redirect('/admin/all-users')
   })
   
 })
 

module.exports = router;
 