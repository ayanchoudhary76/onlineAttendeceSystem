pipeline {
    agent any

    environment {
        AWS_REGION        = 'eu-north-1'
        AWS_ACCOUNT_ID    = '886682669061'
        ECR_BACKEND       = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ayanchoudhary76/attendance-backend"
        ECR_FRONTEND      = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ayanchoudhary76/attendance-frontend"
        CLUSTER_NAME      = 'attendance-cluster'
        IMAGE_TAG         = "${BUILD_NUMBER}"
        VITE_API_URL      = "https://api.attendancelive.dev"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/ayanchoudhary76/onlineAttendeceSystem.git'
            }
        }

        stage('Login to ECR') {
            steps {
                sh '''
                    aws ecr get-login-password --region $AWS_REGION | \
                    docker login --username AWS --password-stdin \
                    $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
                '''
            }
        }

        stage('Build Backend Image') {
            steps {
                dir('backend') {
                    sh '''
                        docker build -t $ECR_BACKEND:$IMAGE_TAG .
                        docker tag  $ECR_BACKEND:$IMAGE_TAG $ECR_BACKEND:latest
                    '''
                }
            }
        }

        stage('Build Frontend Image') {
            steps {
                dir('frontend') {
                    sh '''
                        docker build \
                          --build-arg VITE_API_URL=$VITE_API_URL \
                          -t $ECR_FRONTEND:$IMAGE_TAG .
                        docker tag $ECR_FRONTEND:$IMAGE_TAG $ECR_FRONTEND:latest
                    '''
                }
            }
        }

        stage('Push Images to ECR') {
            steps {
                sh '''
                    docker push $ECR_BACKEND:$IMAGE_TAG
                    docker push $ECR_BACKEND:latest
                    docker push $ECR_FRONTEND:$IMAGE_TAG
                    docker push $ECR_FRONTEND:latest
                '''
            }
        }

        stage('Update kubeconfig') {
            steps {
                sh '''
                    aws eks update-kubeconfig \
                      --region $AWS_REGION \
                      --name $CLUSTER_NAME
                '''
            }
        }

        stage('Deploy to EKS') {
            steps {
                sh '''
                    # Replace image tag placeholders in manifests
                    sed -i "s|IMAGE_TAG|$IMAGE_TAG|g" k8s/backend-deployment.yaml
                    sed -i "s|IMAGE_TAG|$IMAGE_TAG|g" k8s/frontend-deployment.yaml

                    kubectl apply -f k8s/backend-deployment.yaml
                    kubectl apply -f k8s/frontend-deployment.yaml
                    kubectl apply -f k8s/backend-service.yaml
                    kubectl apply -f k8s/frontend-service.yaml

                    kubectl rollout status deployment/attendance-backend  --timeout=120s
                    kubectl rollout status deployment/attendance-frontend --timeout=120s
                '''
            }
        }

        stage('Get Service URLs') {
            steps {
                sh '''
                    echo "====== Backend LoadBalancer ======"
                    kubectl get svc attendance-backend-svc \
                      -o jsonpath="{.status.loadBalancer.ingress[0].hostname}"
                    echo ""
                    echo "====== Frontend LoadBalancer ======"
                    kubectl get svc attendance-frontend-svc \
                      -o jsonpath="{.status.loadBalancer.ingress[0].hostname}"
                    echo ""
                '''
            }
        }
    }

    post {
        success {
            echo '✅ Deployment successful!'
        }
        failure {
            echo '❌ Pipeline failed. Check logs above.'
        }
        always {
            sh 'docker system prune -f || true'
        }
    }
}