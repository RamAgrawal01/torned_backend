const {instance} = require('../config/razorpay');
const Course  = require("../models/Course");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const {paymentSuccessEmail} = require("../mail/templates/paymentSuccessEmail")
const {courseEnrollmentEmail} = require("../mail/templates/courseEnrollmentEmail")
const crypto = require('crypto');
const { default: mongoose } = require('mongoose');
const CourseProgress = require('../models/CourseProgress');

require('dotenv').config();

// *********** PAYMENT FOR MULTIPLE ITEMS ***************//

//******Initialize Payment ***************** */
const Cashfree = require('cashfree-pg');
const axios = require('axios');

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = '' // change to PRODUCTION when live

exports.capturePayment = async (req, res) => {
  console.log("Corrected backend capture payment first step");
  const { coursesId } = req.body;
  const userId = req.user ? req.user.id : null;

  console.log("Received courses:", coursesId);
  console.log("User ID:", userId);

  if (!coursesId || coursesId.length === 0) {
    return res.status(401).json({
      success: false,
      message: "Please Provide Course Id"
    });
  }

  let totalAmount = 0;
  for (const item of coursesId) {
    const courseId = item.courseId || item; // Adjust for your frontend
    let course;
    try {
      course = await Course.findById(courseId);
      if (!course) {
        return res.status(200).json({
          success: false,
          message: "Could not find the course"
        });
      }
      const uid = new mongoose.Types.ObjectId(userId);
      if (course.studentsEnrolled.includes(uid)) {
        return res.status(401).json({
          success: false,
          message: "Student is Already Enrolled in this course"
        });
      }
      totalAmount += course.price;
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }

  try {
    const orderId = `ORDER_${Date.now()}`;

    const orderData = {
      order_id: orderId,
      order_amount: totalAmount, // Cashfree expects rupees, no *100
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_email: req.user.email || "test@example.com",
        customer_phone: req.user.phone || "9999999999",
      },
    };
    console.log("Order data: ",orderData)

    const response = await axios.post(
      'https://sandbox.cashfree.com/pg/orders',
      orderData,
      {
        headers: {
          'x-api-version': '2022-09-01',
          'x-client-id': process.env.CASHFREE_APP_ID,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY,
          'Content-Type': 'application/json',
        }
      }
    );
    // console.log('Response: ',response);

    return res.status(200).json({
      success: true,
      message: response.data,
    });

  } catch (error) {
    console.error(error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Could not initiate payment"
    });
  }
};


exports.verifyPayment = async (req, res) => {
  console.log("verificagtion wala function call ho rha ha ")
  const { orderId, coursesId } = req.body;
  console.log("Order id: ",orderId);
  console.log("curseid: ",coursesId);
  const userId = req.user.id;

  if (!orderId || !coursesId || !userId) {
    return res.status(401).json({
      success: false,
      message: "Missing fields"
    });
  }
console.log("Order id: ",orderId);
console.log("curseid: ",coursesId);
console.log("user id: ",userId);
  try {
    const response = await axios.get(
      `https://sandbox.cashfree.com/pg/orders/${orderId}`,
      {
        headers: {
          'x-api-version': '2022-09-01',
          'x-client-id': process.env.CASHFREE_APP_ID,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        }
      }
    );
    console.log("verification sandbox response: ",response);

    const orderStatus = response.data.order_status;
    console.log("Order status:", orderStatus);

    if (orderStatus === "PAID") {
      // Enroll the student
      enrollStudents(coursesId, userId, res);

      return res.status(200).json({
        success: true,
        message: "Payment verified and user enrolled"
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Payment not completed"
      });
    }

  } catch (error) {
    console.error(error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Could not verify payment"
    });
  }
};


exports.sendPaymentSuccessEmail = async(req,res)=> {
    const {orderId , paymentId , amount } = req.body;

    const userId = req.user.id;

    if(!orderId || !paymentId || !amount || !userId) {
        return res.status(400).json({
            success : false ,
            message : "Please provide all the fields"
        })
    }

    try{
        //student finding
        const enrolledStudent = await User.findById(userId);
        await mailSender(
            enrolledStudent.email , 
            `Payment Recieved`,
            paymentSuccessEmail(
                `${enrolledStudent.firstName}{" "}${enrolledStudent.lastName}`,
                amount/100 , orderId , paymentId
            )
        )
    }
    catch(error){
        console.log("error in sending mail ",error)
        return res.status(500).json({
            success : false,
            message : "Could not send payment success mail"
        })
    }
}


// ***************Enrolled Students function****************//
const enrollStudents = async (courses, userId, res) => {
    if (!courses || !userId) {
        return res.status(400).json({
            success: false,
            message: "Please provide data for Courses or UserId"
        });
    }

    for (const course_id of courses) {
        try{
            // Find the course and enroll the students in it
        const enrolledCourse = await Course.findOneAndUpdate(
            { _id: course_id },
            { $push: { studentsEnrolled: userId } },
            { new: true }
        );

        if (!enrolledCourse) {
            return res.status(500).json({
                success: false,
                message: "Course not found"
            });
        }

        const courseProgress = await CourseProgress.create({
          courseID : course_id,
          userId : userId,
          completedVideos : [],
        })

        // Find the student and add the course to their list of enrolled courses
        const enrollStudent = await User.findByIdAndUpdate(
            userId,
            { $push:{
              courses: course_id,
              courseProgress: courseProgress._id
            } 
             },
            { new: true }
        );

        if (!enrollStudent) {
            return res.status(500).json({
                success: false,
                message: "User not found"
            });
        }

        // Send email
        const emailResponse = await mailSender(
            enrollStudent.email,
            `Successfully Enrolled into ${enrolledCourse.courseName}`,
            courseEnrollmentEmail(enrolledCourse.courseName, `${enrollStudent.firstName}`)
        );
        console.log("Email Sent Successfully", emailResponse);
    }

        catch(error){
            console.log(error);
            return res.status(500).json({ success: false, message: error.message });
        }
   }
}




























// exports.capturePayment = async (req, res) => {
//     // Get course id and user id from request
//     const { course_id } = req.body;
//     const userId = req.user.id;

//     // Validation for course ID
//     if (!course_id) {
//         return res.status(400).json({
//             success: false,
//             message: 'Please provide a valid course ID'
//         });
//     }

//     // Validate course details
//     let course;
//     try {
//         course = await Course.findById(course_id);
//         if (!course) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Could not find the course",
//             });
//         }
//         // Check if user already paid for the same course
        // const uid = new mongoose.Types.ObjectId(userId);
//         if (course.studentsEnrolled.includes(uid)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Student already enrolled",
//             });
//         }
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Could not find the course details",
//             error: error.message,
//         });
//     }

//     // Create order
//     const amount = course.price;
//     const currency = "INR";
//     const options = {
//         amount: amount * 100,
//         currency,
//         receipt: Math.random().toString(36).substring(7),
//         notes: {
//             courseId: course_id,
//             userId,
//         }
//     };

//     try {
//         // Initiate the payment using Razorpay
//         const paymentResponse = await instance.orders.create(options);
//         console.log(paymentResponse);
//         return res.status(200).json({
//             success: true,
//             courseName: course.courseName,
//             courseDescription: course.courseDescription,
//             thumbnail: course.thumbnail,
//             orderId: paymentResponse.id,
//             currency: paymentResponse.currency,
//             amount: paymentResponse.amount,
//         });
//     } catch (err) {
//         console.log(err);
//         return res.status(500).json({
//             success: false,
//             message: "Could not initiate the order",
//             error: err.message,
//         });
//     }
// };
// //VERIFY SIGNATURE*****AUTHORIZE FOR SINGLE ITEM************
// exports.verifyPayment = async(req,res) => {
//     const webhookSecret = "12345678";

//     const signature  = req.headers("x-razorpay-signature");

//     const shasum =  crypto.createHmac("sha256",webhookSecret);
//     shasum.update(JSON.stringify(req.body));

//     const digest  = shasum.digest("hex");

//     if(signature == digest) {
//         console.log("Payment is Authorized");

//         const{courseId , userId}  = req.body.payload.payment.entity.notes;

//         try{
//             //fulfill the action

//             //find the course and enroll student in it 
//             const enrolledCourse = await Course.findOneAndUpdate(
//                                         {_id : courseId},
//                                         {$push:{studentsEnrolled:userId}},
//                                         {new:true},
//                                         );
//                 if(!enrolledCourse) {
//                     return res.status(500).json({
//                         success : false ,
//                         message : "Course not found",
//                     })
//                 }
//                 console.log(enrolledCourse);

//                 //find the student and added the course to thier enrolled course
//                 const enrolledStudent = await User.findOneAndUpdate(
//                     {_id:userId},
//                     {$push:{courses : courseId}},
//                     {new : true},
//                 );
//                 console.log(enrolledStudent);

//                 //mail
//                 const emailResponse = await mailSender(
//                     enrolledStudent.email,
//                     "congrajulations from Torned Education",
//                     "COngratulatiojfajfgajgjagjalgja",
//                 );
//                 console.log(emailResponse);
//                 return res.status(200).json({
//                     success : true ,
//                     message : 'Signature verified and course added',
//                 });
//             }
//     catch(error) {
//         console.log(error);
//         return res.status(500).json({
//             success : false,
//             message : error.message,
//         })
//     }
// }
//     else{
//         return res.status(400).json({
//             success : false,
//             message : "Signatur not verified"
//         })
//     }
// };
