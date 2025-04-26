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
exports.capturePayment = async (req, res) => {
  console.log("Corrected backend capture payment ist step");
  const { coursesId } = req.body;
  const userId = req.user ? req.user.id : null; // Ensure userId is not null or undefined

  console.log("Received courses:", coursesId);
  console.log("User ID:", userId);

  //mistake : i got the courses id is in form of arrray Received courses: [ { courseId: '669913ec63a5cb1ec76e8c2b' } ] this is not good because
  // it is course id property rather than just course id as string so need to updated it in string format 

  if (!coursesId || coursesId.length === 0) {
    return res.status(401).json({
      success: false,
      message: "Please Provide Course Id"
    });
  }

  let totalAmount = 0;
  for (const course_id of coursesId) {
    let course;
    try {
      course = await Course.findById(course_id);
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

  const options = {
    amount: totalAmount * 100,
    currency: "INR",
    receipt: Math.random(Date.now()).toString(),
  };
  try {
    const paymentResponse = await instance.orders.create(options);
    res.status(200).json({
      success: true,
      message: paymentResponse,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Could not initiate payment"
    });
  }
};

exports.verifyPayment = async(req,res) => {
    const razorpay_order_id = req.body?.razorpay_order_id;
    const razorpay_payment_id = req.body?.razorpay_payment_id;
    const razorpay_signature = req.body?.razorpay_signature;
    const courses = req.body?.coursesId;
    const userId = req.user.id;

    if(!razorpay_order_id || !razorpay_payment_id || !razorpay_signature
        || !courses || !userId
    ){
        return res.status(401).json({
            success : false,
            message : "Payment failed"
        })
    }

    let body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body.toString())
        .digest("hex");

    if(expectedSignature === razorpay_signature){
        //enrolll student in course
        enrollStudents(courses,userId,res);
        //response reutrn
        return res.status(200).json(
            {success : true,
                message: "payment verified"
            })
    }
    return res.status(200).json({
        success : false ,
        message : "Payment not verified"
    })
}

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
